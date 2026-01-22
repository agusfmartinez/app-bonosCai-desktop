import { fetchWithAuth } from './api'

const TOKEN_KEY = 'bp_token'
const SESSION_ID_KEY = 'bp_session_id'

let inFlight = false; let lastToken = null;

export function getStoredSession() {
  const token = localStorage.getItem(TOKEN_KEY) || null
  const sessionId = localStorage.getItem(SESSION_ID_KEY) || null
  if (!token || !sessionId) return { token: null, sessionId: null }
  return { token, sessionId }
}

export function storeSession(token, sessionId) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(SESSION_ID_KEY, sessionId)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SESSION_ID_KEY)
}

export async function initBackendSession({ accessToken, endpoint = '/api/session/init' } = {}) {
  if (!accessToken) {
    return { ok: false, status: 0, reason: 'missing-token', detail: 'Access token requerido' }
  }

  const existing = localStorage.getItem(SESSION_ID_KEY) || null;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(existing ? { 'x-session-id': existing } : {}),
    },
  });

  const rawBody = await response.text()
  let data = null
  try {
    data = rawBody ? JSON.parse(rawBody) : null
  } catch {
    data = rawBody || null
  }

  if (response.status === 403) {
    clearSession()
    return { ok: false, status: 403, reason: 'forbidden', detail: data }
  }

  if (!response.ok) {
    clearSession()
    return {
      ok: false,
      status: response.status,
      reason: 'error',
      detail: data,
    }
  }

  const sessionId = data?.sessionId
  if (!sessionId) {
    clearSession()
    return { ok: false, status: response.status, reason: 'invalid-payload', detail: data }
  }

  storeSession(accessToken, sessionId)
  return { ok: true, status: response.status, sessionId }
}
