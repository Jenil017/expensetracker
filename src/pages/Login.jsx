import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { useToast } from '../components/Toast.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function AppLogo() {
  return (
    <div className="relative">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-fab">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="4" y="4" width="12" height="28" rx="3" fill="white" opacity="0.9"/>
          <rect x="20" y="4" width="12" height="28" rx="3" fill="white" opacity="0.6"/>
          <line x1="7" y1="12" x2="13" y2="12" stroke="#2C5EAD" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="7" y1="16" x2="13" y2="16" stroke="#2C5EAD" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="7" y1="20" x2="13" y2="20" stroke="#2C5EAD" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  )
}

export default function Login() {
  const { login, register, googleLogin, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const googleBtnRef = useRef(null)
  const callbackRef = useRef(null)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    callbackRef.current = async (response) => {
      setBusy(true)
      try {
        await googleLogin(response.credential)
        navigate('/', { replace: true })
      } catch (err) {
        toast.error(err.message)
      } finally {
        setBusy(false)
      }
    }
    const tryInit = () => {
      if (!window.google?.accounts?.id) { setTimeout(tryInit, 300); return }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r) => callbackRef.current?.(r),
      })
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline', size: 'large', width: 320, text: 'continue_with',
        })
      }
    }
    tryInit()
  }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password })
      } else {
        if (!form.name.trim()) return toast.error('Name is required')
        await register({ name: form.name, email: form.email, password: form.password })
      }
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-brand-50 via-white to-brand-100 flex flex-col items-center justify-center px-4 py-10">
      {/* Hero */}
      <div className="text-center mb-8 animate-fade-up">
        <AppLogo />
        <h1 className="mt-4 text-3xl font-extrabold text-brand-800 tracking-tight">Transaction Buddy</h1>
        <p className="mt-1.5 text-brand-400 text-sm">Track money with anyone, anywhere</p>
      </div>

      <div className="w-full max-w-sm">
        {/* Mode toggle */}
        <div className="p-1 bg-brand-50 rounded-2xl flex mb-6 animate-fade-up stagger-1">
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mode === m
                  ? 'bg-white text-brand-500 shadow-card'
                  : 'text-brand-300 hover:text-brand-400'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Google btn */}
        {GOOGLE_CLIENT_ID && (
          <div className="mb-4 flex justify-center animate-fade-up stagger-2">
            <div ref={googleBtnRef} className="overflow-hidden rounded-xl" />
          </div>
        )}

        {GOOGLE_CLIENT_ID && (
          <div className="flex items-center gap-3 mb-4 animate-fade-up stagger-2">
            <hr className="flex-1 border-brand-100" />
            <span className="text-xs text-brand-300 font-medium">or</span>
            <hr className="flex-1 border-brand-100" />
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="space-y-3 animate-fade-up stagger-3">
          {mode === 'register' && (
            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                placeholder="Your full name"
                value={form.name}
                onChange={set('name')}
                autoComplete="name"
                required
              />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
              value={form.password}
              onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 6 : undefined}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3 text-base mt-2"
            disabled={busy}
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-brand-300 animate-fade-up stagger-4">
          By continuing, you agree to use this app responsibly.
        </p>
      </div>
    </div>
  )
}
