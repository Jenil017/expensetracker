export const TOKEN_KEY = 'khatabook_token'

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
    localStorage.removeItem(TOKEN_KEY)
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try { const j = await res.json(); if (j?.error) msg = j.error } catch { /* */ }
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
  // auth
  googleLogin: (credential) => request('POST', '/auth/google', { credential }),
  register: (data) => request('POST', '/auth/register', data),
  login: (data) => request('POST', '/auth/login', data),
  me: () => request('GET', '/auth/me'),
  updateMe: (data) => request('PUT', '/auth/me', data),

  // persons
  listPersons: () => request('GET', '/persons'),
  createPerson: (data) => request('POST', '/persons', data),
  updatePerson: (id, data) => request('PUT', `/persons/${id}`, data),
  deletePerson: (id) => request('DELETE', `/persons/${id}`),

  // person transactions
  listTransactions: (personId, params = {}) => request('GET', `/persons/${personId}/transactions${qs(params)}`),
  createTransaction: (data) => request('POST', '/transactions', data),
  updateTransaction: (id, data) => request('PUT', `/transactions/${id}`, data),
  deleteTransaction: (id) => request('DELETE', `/transactions/${id}`),

  // global search
  search: (q) => request('GET', `/search?q=${encodeURIComponent(q)}`),

  // expenses
  listExpenses: (params = {}) => request('GET', `/expenses${qs(params)}`),
  createExpense: (data) => request('POST', '/expenses', data),
  updateExpense: (id, data) => request('PUT', `/expenses/${id}`, data),
  deleteExpense: (id) => request('DELETE', `/expenses/${id}`),
}
