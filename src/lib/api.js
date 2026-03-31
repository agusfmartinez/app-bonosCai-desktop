// src/lib/api.js

const API_URL = import.meta.env.VITE_API_URL

export function fetchWithAuth(path, options = {}) {
  const token = localStorage.getItem('bp_token')
  const sessionId = localStorage.getItem('bp_session_id')
  const appVersion = typeof window !== 'undefined'
    ? (window.__APP_VERSION__ || localStorage.getItem('bp_app_version'))
    : null
  const hasAuthHeader = !!(options.headers && (
    'Authorization' in options.headers || 'authorization' in options.headers
  ))
  const headers = {
    ...(options.headers || {}),
    'Content-Type': 'application/json',
    ...(!hasAuthHeader && token ? { Authorization: `Bearer ${token}` } : {}),
    ...(sessionId ? { 'x-session-id': sessionId } : {}),
    ...(appVersion ? { 'x-app-version': appVersion } : {}),
  }
  return fetch(`${API_URL}${path}`, { ...options, headers })
}
