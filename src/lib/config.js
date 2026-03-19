// src/lib/config.js
import { fetchWithAuth } from './api'

export async function getConfig() {
  try {
    const res = await fetchWithAuth('/api/user/config', { method: 'GET' })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, status: res.status, detail: data }
    }
    return { ok: true, lastConfig: data?.last_config ?? null }
  } catch (error) {
    return { ok: false, status: 0, detail: error?.message || String(error) }
  }
}

export async function saveConfig(lastConfig) {
  try {
    const res = await fetchWithAuth('/api/user/config', {
      method: 'POST',
      body: JSON.stringify({ lastConfig }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, status: res.status, detail: data }
    }
    return { ok: true, lastConfig: data?.lastConfig ?? lastConfig }
  } catch (error) {
    return { ok: false, status: 0, detail: error?.message || String(error) }
  }
}
