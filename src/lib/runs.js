// src/lib/runs.js
import { fetchWithAuth } from './api'

const MAX_ERROR_LEN = 1000

export async function startRun() {
  try {
    const res = await fetchWithAuth('/api/runs/start', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, status: res.status, detail: data }
    }
    return { ok: true, runId: data?.runId || null }
  } catch (error) {
    return { ok: false, status: 0, detail: error?.message || String(error) }
  }
}

export async function finishRun(runId, status, errorMessage = null) {
  if (!runId) return { ok: false, status: 0, reason: 'missing-runId' }
  const err =
    typeof errorMessage === 'string' && errorMessage
      ? errorMessage.slice(0, MAX_ERROR_LEN)
      : null
  try {
    const res = await fetchWithAuth('/api/runs/end', {
      method: 'POST',
      body: JSON.stringify({
        runId,
        status,
        ...(err ? { error: err } : {}),
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, status: res.status, detail: data }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, status: 0, detail: error?.message || String(error) }
  }
}
