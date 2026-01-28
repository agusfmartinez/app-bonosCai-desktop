import { useEffect, useState } from 'react'

export function useRunnerStatus(pollMs = 500) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    const poll = async () => {
      try {
        const res = await window.api.getRunnerStatus()
        if (!mounted) return
        setStatus(res.status)
        setError(res.error)
      } catch (e) {
        if (!mounted) return
        setStatus('error')
        setError('No se pudo obtener estado del runner')
      }
    }

    poll()
    const id = setInterval(poll, pollMs)

    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [pollMs])

  return { status, error }
}
