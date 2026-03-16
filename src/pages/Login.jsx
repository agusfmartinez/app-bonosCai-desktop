import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { pageContainerClass, pageCardNarrowClass, inputClass, baseButtonClass } from '../styles/classes'

const RECENT_EMAILS_KEY = 'bp_recent_emails'
const MAX_RECENT_EMAILS = 6
export default function Login() {
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [code, setCode] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [msg, setMsg] = useState('')
  const [recentEmails, setRecentEmails] = useState([])
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const st = location.state
    if (st?.email) {
      setEmail(st.email)
      if (st.otpSent) setOtpSent(true)
      return
    }

    const pendingEmail = sessionStorage.getItem('pendingEmail') || ''
    if (pendingEmail) setEmail(pendingEmail)
    if (sessionStorage.getItem('otpSent') === '1') setOtpSent(true)
  }, [location.state])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_EMAILS_KEY)
      const list = raw ? JSON.parse(raw) : []
      if (Array.isArray(list)) setRecentEmails(list)
    } catch {
      // ignore
    }
  }, [])

  const storeRecentEmail = (value) => {
    const emailClean = String(value || '').trim().toLowerCase()
    if (!emailClean) return
    const current = Array.isArray(recentEmails) ? recentEmails : []
    const next = [emailClean, ...current.filter((e) => e !== emailClean)].slice(0, MAX_RECENT_EMAILS)
    setRecentEmails(next)
    try {
      localStorage.setItem(RECENT_EMAILS_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  const clearRecentEmails = () => {
    setRecentEmails([])
    try {
      localStorage.removeItem(RECENT_EMAILS_KEY)
    } catch {
      // ignore
    }
  }


  function mapOtpError(err) {
    const status = err?.status
    const message = (err?.message || '').toLowerCase()

    if (status === 422 && message.includes('signups not allowed')) {
      return 'Ese correo no está registrado. Registrate primero.'
    }
    if (status === 429) {
      return 'Demasiadas solicitudes. Probá en unos minutos.'
    }
    if (status === 400) {
      return 'Ingresá un email válido.'
    }
    return 'No pudimos enviar el código. Intentá de nuevo.'
  }

  async function sendCode() {
    const emailClean = email.trim().toLowerCase()
    if (!emailClean) {
      setMsg('Ingresá tu email.')
      return
    }
    setSendingOtp(true); setMsg('')
    try {
        const { error } = await supabase.auth.signInWithOtp({
          email: emailClean,
          options: { shouldCreateUser: false },
        })
        if (error) {
          setMsg(mapOtpError(error))
          return
        }
        setOtpSent(true)
        storeRecentEmail(emailClean)
        setMsg('Te enviamos un codigo al mail.')
    } catch (error) {
        setMsg('Error de red. Intentá de nuevo.')
    } finally{
        setSendingOtp(false)
    }

  }

  async function verifyCode() {
    const emailClean = email.trim().toLowerCase()
    if (!emailClean) return setMsg('Ingresá tu email.')
    if (!code || code.length !== 6) return setMsg('Ingresá el código de 6 dígitos.')
    setVerifying(true); setMsg('')
    const { error } = await supabase.auth.verifyOtp({ email: emailClean, token: code, type: 'email' })
    if (error) { setVerifying(false); return setMsg(error.message) }

    try {
      sessionStorage.removeItem('pendingEmail')
      sessionStorage.removeItem('otpSent')
      storeRecentEmail(emailClean)
      navigate('/')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className={pageContainerClass}>
      <div className={pageCardNarrowClass}>
        <h2 className="text-xl font-bold text-white mb-4">Ingresa</h2>


        <input
          type="email"
          name="email"
          autoComplete="email"
          list="recent-emails"
          placeholder="tu@email.com"
          className={`${inputClass}`}
          value={email}
          onChange={e=>setEmail(e.target.value)}
        />
        <datalist id="recent-emails">
          {recentEmails.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        {recentEmails.length > 0 && (
          <button
            type="button"
            className="text-xs text-red-200 underline hover:text-white"
            onClick={clearRecentEmails}
          >
            Borrar emails recientes
          </button>
        )}
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Codigo de 6 digitos"
          className={`${inputClass} my-3`}
          value={code}
          onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
        />
        <button
          disabled={sendingOtp || otpSent}
          onClick={sendCode}
          className={`${baseButtonClass} w-full bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-60 mb-2`}
        >
          {sendingOtp ? 'Enviando...' : 'Enviar código'}
        </button>
        <button
          onClick={verifyCode}
          className={`${baseButtonClass} w-full bg-emerald-500 text-white hover:bg-emerald-400`}
        >
          {verifying ? 'Verificando...' : 'Verificar e ingresar'}
        </button>

        <p className="text-sm text-white mt-4 text-center">
          ¿No tenes cuenta?{' '}
          <Link to="/signup" className="text-sky-300 hover:text-sky-200">
            Registrate aca
          </Link>
        </p>

        <p className="text-sm text-white mt-4 text-center">
          ¿No recibiste el código?{' '}
          <button
            type="button"
            className="underline text-sky-300 hover:text-sky-200"
            onClick={() => { setOtpSent(false); setCode(''); setMsg(''); sessionStorage.removeItem('otpSent')}}
          >
            Reenviar
          </button>
        </p>



        {msg && <p className="text-sm text-white mt-3">{msg}</p>}
      </div>
    </div>
  )
}

