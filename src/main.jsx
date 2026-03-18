import { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import "./styles/index.css";
import { supabase } from "./lib/supabase";
import { initBackendSession, clearSession } from "./lib/session";
import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Pending from "./pages/Pending.jsx";
import Signup from "./pages/Signup.jsx";
import Loading from "./components/Loading.jsx";
import SessionExpired from "./components/SessionExpired.jsx";


const PUBLIC_ROUTES = ["/login", "/signup", "/pending"];

function useAuthGate() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [expired, setExpired] = useState(false);


  const navigate = useNavigate();
  const location = useLocation();
  
  const channelRef = useRef(null);
  const authSubRef = useRef(null);
  const expireTimerRef = useRef(null);
  const bootstrappedRef = useRef(false);
  const expiredRef = useRef(false);
  const locationRef = useRef(location.pathname);
  const sessionIdRef = useRef(null);

  const cleanupChannel = async () => {
    const ch = channelRef.current
    if (!ch) return
    try {
      await supabase.removeChannel(ch) // no retorna {subscription}
    } catch {}
    channelRef.current = null
    sessionIdRef.current = null
  }

  const subscribeUserSession = async (userId, navigate, expectedSessionId = null) => {
    await cleanupChannel()
    if (!userId) return
    if (expectedSessionId && sessionIdRef.current === expectedSessionId) return
    sessionIdRef.current = expectedSessionId || localStorage.getItem('bp_session_id') || null

    const ch = supabase
      .channel(`user-session-watch:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_sessions',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const remote = payload?.new?.session_id
        const local = sessionIdRef.current
        console.info('[AUTH] session watch', { remote, local })
        if (remote && local && remote !== local) {
          supabase.auth.signOut().finally(() => {
            clearSession()
            navigate('/login', { replace: true })
          })
        }
      })

    // No destructurar; no hay { data: { subscription } }
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = ch
        sessionIdRef.current = expectedSessionId || localStorage.getItem('bp_session_id') || null
      }
    })

    return ch
  }

  const handleInitFailure = async (result) => {
    await supabase.auth.signOut()
    clearSession()
    setAllowed(false)
    navigate(result?.reason === 'forbidden' ? '/pending' : '/login', { replace: true })
  }

  const handleExpiredSession = async () => {
    setExpired(true)
    expiredRef.current = true
    setAllowed(false)
    setBootstrapped(true)
    bootstrappedRef.current = true
    setReady(true)
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current)
    expireTimerRef.current = setTimeout(() => {
      setExpired(false)
      expiredRef.current = false
      navigate('/login', { replace: true })
    }, 1200)
    try {
      await supabase.auth.signOut()
    } finally {
      clearSession()
    }
  }

  useEffect(() => {
    bootstrappedRef.current = bootstrapped
  }, [bootstrapped])

  useEffect(() => {
    expiredRef.current = expired
  }, [expired])

  useEffect(() => {
    locationRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    // Suscripción a cambios de auth (una sola vez)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.info('[AUTH] onAuthStateChange', { event, hasSession: !!session });
      if (!session) {
        cleanupChannel()
        clearSession()
        setAllowed(false)
        if (bootstrappedRef.current && !expiredRef.current && !PUBLIC_ROUTES.includes(locationRef.current)) {
          navigate('/login', { replace: true })
        }
        return
      }

      if (event === 'SIGNED_IN') {
        const prevToken = localStorage.getItem('bp_token')
        const curToken = session.access_token

        // Si es el mismo token, fue un reload: no tocar last_signed_in
        if (prevToken && prevToken === curToken) {
          setAllowed(true)
          const expected = localStorage.getItem('bp_session_id')
          subscribeUserSession(session.user.id, navigate, expected)
          if (location.pathname === '/login' || location.pathname === '/pending') {
            navigate('/', { replace: true })
          }
          return
        }

        // Solo login “nuevo” inicia sesión única en backend
        const result = await initBackendSession({ accessToken: curToken })
        console.info('[AUTH] initBackendSession result', result);
        if (!result.ok) {
          if (result.status === 401) {
            await handleExpiredSession()
            return
          }
          if (result.reason !== 'in-flight') {
            await handleInitFailure(result)
          }
          return
        }
        setAllowed(true)
        subscribeUserSession(session.user.id, navigate, result.sessionId)
        if (locationRef.current === '/login' || locationRef.current === '/pending') {
          navigate('/', { replace: true })
        }
      }

      // Ignorar: INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED
    })

    // Bootstrap: refrescar token si es necesario antes de validar con backend
    ;(async () => {
      try {
        const { data: initial } = await supabase.auth.getSession()
        console.info('[AUTH] bootstrap getSession', { hasSession: !!initial.session });

        if (initial.session) {
          let session = initial.session
          const expiresAt = (session.expires_at || 0) * 1000
          if (expiresAt && Date.now() > expiresAt - 30_000) {
            const { data: refreshed, error } = await supabase.auth.refreshSession()
            if (error || !refreshed?.session) {
              await handleExpiredSession()
              return
            }
            session = refreshed.session
          }

          const accessToken = session.access_token;
          const result = await initBackendSession({ accessToken });

          if (!result.ok) {
            if (result.status === 401) {
              await handleExpiredSession()
              return
            }
            if (result.reason !== 'in-flight') {
              await handleInitFailure(result);
            }
            return;
          }

          setAllowed(true);
          subscribeUserSession(initial.session.user.id, navigate, result.sessionId);

        } else {
          clearSession()
          setAllowed(false)
        }
      } finally {
        setBootstrapped(true);
        bootstrappedRef.current = true
        setReady(true)
      }
    })()

    return () => {
      subscription.unsubscribe()
      cleanupChannel()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current)
    }
  }, [])

  return { ready, allowed, expired };
}

function Root() {
  const { ready, allowed, expired } = useAuthGate();
  if (!ready) return <Loading />;
  if (expired) return <SessionExpired />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pending" element={<Pending />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={allowed ? <App /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById("root")).render(
  <HashRouter>
    <Root />
  </HashRouter>
);
