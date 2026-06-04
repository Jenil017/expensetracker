// Simple shared-password gate. The password doubles as the Bearer token sent on
// every API request (see api.js). Validated against the server's APP_PASSWORD.
import { createContext, useContext, useEffect, useState } from 'react'
import { TOKEN_KEY } from './api.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

async function validate(password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return res.ok
}

export function AuthProvider({ children }) {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // On load, silently validate any stored password.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    validate(token)
      .then((ok) => {
        if (ok) setAuthorized(true)
        else localStorage.removeItem(TOKEN_KEY)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = async (password) => {
    setError('')
    try {
      const ok = await validate(password)
      if (ok) {
        localStorage.setItem(TOKEN_KEY, password)
        setAuthorized(true)
      } else {
        setError('Wrong password.')
      }
    } catch {
      setError('Could not reach the server. Is it running?')
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setAuthorized(false)
  }

  const value = { authorized, loading, error, login, logout }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
