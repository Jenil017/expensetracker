import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, TOKEN_KEY } from './api.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setLoading(false); return }
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const setToken = (token, userData) => {
    localStorage.setItem(TOKEN_KEY, token)
    setUser(userData)
  }

  const register = async ({ name, email, password }) => {
    const { token, user } = await api.register({ name, email, password })
    setToken(token, user)
  }

  const login = async ({ email, password }) => {
    const { token, user } = await api.login({ email, password })
    setToken(token, user)
  }

  const googleLogin = async (credential) => {
    const { token, user } = await api.googleLogin(credential)
    setToken(token, user)
  }

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  const updateUser = async (data) => {
    const { user: updated } = await api.updateMe(data)
    setUser(updated)
    return updated
  }

  return (
    <AuthCtx.Provider value={{ user, loading, register, login, googleLogin, logout, updateUser }}>
      {children}
    </AuthCtx.Provider>
  )
}
