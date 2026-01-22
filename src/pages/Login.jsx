import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { initBackendSession } from '../lib/session'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { pageContainerClass, pageCardNarrowClass, inputClass, baseButtonClass } from '../styles/classes'
export default function Login() {
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [code, setCode] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [msg, setMsg] = useState('')
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

    const { data: sess } = await supabase.auth.getSession()
    const accessToken = sess?.session?.access_token
    if (!accessToken) { setVerifying(false); return setMsg('No se obtuvo token') }

    try {
      const result = await initBackendSession({ accessToken })
      if (!result.ok) {
        if (result.reason === 'forbidden') {
          setMsg('Tu cuenta aun no esta habilitada.')
          await supabase.auth.signOut()
          navigate('/pending', { replace: true })
        } else {
          const detail = typeof result.detail === 'string' && result.detail ? ': ' + result.detail : ''
          setMsg('Fallo inicio de sesion unica' + detail)
          await supabase.auth.signOut()
        }
        return
      }
      sessionStorage.removeItem('pendingEmail')
      sessionStorage.removeItem('otpSent')

      navigate('/')
    } catch (err) {
      setMsg('Fallo inicio de sesion unica: ' + err.message)
      await supabase.auth.signOut()
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
          placeholder="tu@email.com"
          className={`${inputClass} mb-3`}
          value={email}
          onChange={e=>setEmail(e.target.value)}
        />
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Codigo de 6 digitos"
          className={`${inputClass} mb-3`}
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

