// Data layer: talks to the same-origin /api REST server (Express + Neon Postgres).
// Keeps the exact interface the pages already use, so UI code is unchanged.
// Auth is a single shared password, sent as a Bearer token on every request.

export const TOKEN_KEY = 'hisab_token'

const getToken = () => localStorage.getItem(TOKEN_KEY) || ''

async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${getToken()}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    // Token rejected — drop it and bounce back to the login screen.
    localStorage.removeItem(TOKEN_KEY)
    window.location.reload()
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg)
  }
  if (res.status === 204) return null
  return res.json()
}

const qs = (params = {}) => {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v)
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const api = {
  // ----- ledgers -----
  listLedgers: () => request('GET', '/ledgers'),
  getLedger: (id) => request('GET', `/ledgers/${id}`),
  createLedger: (data) => request('POST', '/ledgers', data),
  updateLedger: (id, data) => request('PUT', `/ledgers/${id}`, data),
  deleteLedger: (id) => request('DELETE', `/ledgers/${id}`),

  // ----- transactions -----
  listTransactions: (params = {}) => request('GET', `/transactions${qs(params)}`),
  createTransaction: (data) => request('POST', '/transactions', data),
  updateTransaction: (id, data) => request('PUT', `/transactions/${id}`, data),
  deleteTransaction: (id) => request('DELETE', `/transactions/${id}`),

  // ----- backup -----
  exportData: () => request('GET', '/export'),
  importData: (payload) => request('POST', '/import', payload),
}
