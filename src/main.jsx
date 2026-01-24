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


const PUBLIC_ROUTES = ["/login", "/signup", "/pending"];

function useAuthGate() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);


  const navigate = useNavigate();
  const location = useLocation();
  
  const channelRef = useRef(null);
  const authSubRef = useRef(null);

  const cleanupChannel = async () => {
  const ch = channelRef.current
  if (!ch) return
  try {
    await supabase.removeChannel(ch) // no retorna {subscription}
  } catch {}
    channelRef.current = null
  }

  const subscribeUserSession = async (userId, navigate) => {
    await cleanupChannel()
    if (!userId) return

    const ch = supabase
      .channel(`user-session-watch:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_sessions',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const remote = payload?.new?.session_id
        const local = localStorage.getItem('bp_session_id')
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
      }
    })

    return ch
  }

  useEffect(() => {
    const handleInitFailure = async (result) => {
      await supabase.auth.signOut()
      clearSession()
      setAllowed(false)
      navigate(result?.reason === 'forbidden' ? '/pending' : '/login', { replace: true })
    }

    // Suscripción a cambios de auth (una sola vez)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.info('[AUTH] onAuthStateChange', { event, hasSession: !!session });
      if (!session) {
        cleanupChannel()
        clearSession()
        setAllowed(false)
        if (bootstrapped && !PUBLIC_ROUTES.includes(location.pathname)) {
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
          subscribeUserSession(session.user.id, navigate)
          if (location.pathname === '/login' || location.pathname === '/pending') {
            navigate('/', { replace: true })
          }
          return
        }

        // Solo login “nuevo” inicia sesión única en backend
        const result = await initBackendSession({ accessToken: curToken })
        console.info('[AUTH] initBackendSession result', result);
        if (!result.ok) {
          await handleInitFailure(result)
          return
        }
        setAllowed(true)
        subscribeUserSession(session.user.id, navigate)
        if (location.pathname === '/login' || location.pathname === '/pending') {
          navigate('/', { replace: true })
        }
      }

      // Ignorar: INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED
    })

    // Bootstrap: no invocar init acá; solo preparar estado inicial y marcar ready
    ;(async () => {
      try {
        const { data: initial } = await supabase.auth.getSession()
        console.info('[AUTH] bootstrap getSession', { hasSession: !!initial.session });

        if (initial.session) {
          const accessToken = initial.session.access_token;
          const result = await initBackendSession({ accessToken });

          if (!result.ok) {
            await handleInitFailure(result);
            return;
          }

          setAllowed(true);
          subscribeUserSession(initial.session.user.id, navigate);

        } else {
          clearSession()
          setAllowed(false)
        }
      } finally {
        setBootstrapped(true);
        setReady(true)
      }
    })()

    return () => {
      subscription.unsubscribe()
      cleanupChannel()
    }
  }, [navigate, bootstrapped, location.pathname])

  return { ready, allowed };
}

function Root() {
  const { ready, allowed } = useAuthGate();
  if (!ready) return <Loading />;

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
