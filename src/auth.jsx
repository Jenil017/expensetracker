import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider, OWNER_EMAIL, isConfigured } from './firebase.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still loading
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isConfigured) {
      setUser(null)
      return
    }
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

  const login = async () => {
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setError(e.message)
    }
  }

  const value = {
    user,
    loading: user === undefined,
    // Authorized only if signed in AND (no owner restriction set OR email matches owner).
    authorized: !!user && (!OWNER_EMAIL || user.email === OWNER_EMAIL),
    error,
    login,
    logout: () => signOut(auth),
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
