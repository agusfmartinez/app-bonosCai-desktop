// src/lib/api.js
export function fetchWithAuth(path, options = {}) {
  const token = localStorage.getItem('bp_token')
  const sessionId = localStorage.getItem('bp_session_id')
  const headers = {
    ...(options.headers || {}),
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(sessionId ? { 'x-session-id': sessionId } : {}),
  }
  return fetch(path, { ...options, headers })
}
