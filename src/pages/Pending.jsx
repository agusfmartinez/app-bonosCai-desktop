// src/pages/Pending.jsx
import { useNavigate, useLocation } from 'react-router-dom'
import { pageContainerClass, pageCardNarrowClass } from '../styles/classes'

export default function Pending() {
  const navigate = useNavigate()
  const { state } = useLocation()

  return (
    <div className={pageContainerClass}>
      <div className={`${pageCardNarrowClass} text-center text-white`}>
        <h2 className="text-xl font-bold mb-2">Tu cuenta está en revisión</h2>
        <p className="text-sm opacity-80">
          Te enviamos el enlace de verificación, pero todavía no estás en la whitelist.
          Cuando el admin te habilite, podrás ingresar.
        </p>
        <p className="text-sm text-white mt-4 text-center">
          <button
            type="button"
            className="text-sky-300 hover:text-sky-200"
            onClick={() => navigate('/login', { state: { email: state?.email, otpSent: state?.otpSent} })}
          >
            Volver
          </button>
        </p>
      </div>
    </div>
  )
}

