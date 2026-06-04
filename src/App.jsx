import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import BottomNav from './components/BottomNav.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import PersonDetail from './pages/PersonDetail.jsx'
import Analytics from './pages/Analytics.jsx'
import Profile from './pages/Profile.jsx'

function ProtectedLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AppLoader />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  const showNav = ['/', '/analytics', '/profile'].includes(location.pathname)

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/persons/:id" element={<PersonDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  )
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  )
}

function AppLoader() {
  return (
    <div className="min-h-dvh bg-brand-gradient flex flex-col items-center justify-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="4" y="4" width="12" height="28" rx="3" fill="white" opacity="0.9"/>
          <rect x="20" y="4" width="12" height="28" rx="3" fill="white" opacity="0.6"/>
        </svg>
      </div>
      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  )
}
