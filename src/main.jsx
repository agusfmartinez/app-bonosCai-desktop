import { StrictMode, useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import "./styles/index.css";
import { supabase } from "./lib/supabase";
import { initBackendSession, clearSession } from "./lib/session";
import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Pending from "./pages/Pending.jsx";
import Signup from "./pages/Signup.jsx";

const PUBLIC_ROUTES = ["/login", "/signup", "/pending"];

function useAuthGate() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();
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


const subscribeUserSession = async (userId) => {
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
          if (location.pathname !== '/login') window.location.replace('/login')
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
    if (!session) {
      cleanupChannel()
      clearSession()
      setAllowed(false)
      if (!PUBLIC_ROUTES.includes(location.pathname)) {
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
        subscribeUserSession(session.user.id)
        if (location.pathname === '/login' || location.pathname === '/pending') {
          navigate('/', { replace: true })
        }
        return
      }

      // Solo login “nuevo” inicia sesión única en backend
      const result = await initBackendSession({ accessToken: curToken })
      if (!result.ok) {
        await handleInitFailure(result)
        return
      }
      setAllowed(true)
      subscribeUserSession(session.user.id)
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
      if (!initial.session) {
        clearSession()
        setAllowed(false)
      }
    } finally {
      setReady(true)
    }
  })()

  return () => {
    subscription.unsubscribe()
    cleanupChannel()
  }
}, [navigate])




  return { ready, allowed };
}

function Root() {
  const { ready, allowed } = useAuthGate();
  if (!ready) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pending" element={<Pending />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          allowed ? (
            <App allowed={allowed} ready={ready} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>
);
