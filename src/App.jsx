import { useState } from 'react'
import { Routes, Route, NavLink, Link } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LedgerForm from './pages/LedgerForm.jsx'
import LedgerDetail from './pages/LedgerDetail.jsx'
import Hisab from './pages/Hisab.jsx'
import Search from './pages/Search.jsx'
import Backup from './pages/Backup.jsx'

function NavItem({ to, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-200'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export default function App() {
  const { loading, authorized, login, logout, error } = useAuth()

  if (loading) return <Centered>Loading…</Centered>
  if (!authorized) return <Login login={login} error={error} />

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">₹</span>
            Hisab
          </Link>
          <nav className="flex items-center gap-1">
            <NavItem to="/" end>
              Dashboard
            </NavItem>
            <NavItem to="/history">History</NavItem>
            <NavItem to="/backup">Backup</NavItem>
            <button
              onClick={logout}
              className="ml-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-200"
            >
              Lock
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ledgers/new" element={<LedgerForm />} />
          <Route path="/ledgers/:id" element={<LedgerDetail />} />
          <Route path="/ledgers/:id/edit" element={<LedgerForm />} />
          <Route path="/hisab/:id" element={<Hisab />} />
          <Route path="/history" element={<Search />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

function Centered({ children }) {
  return <div className="grid min-h-screen place-items-center text-slate-500">{children}</div>
}

function Login({ login, error }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    await login(pw)
    setBusy(false)
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">
          ₹
        </div>
        <h1 className="text-xl font-bold text-slate-900">Hisab</h1>
        <p className="mt-1 text-sm text-slate-500">Personal expense tracker</p>

        <form onSubmit={submit} className="mt-6 space-y-3 text-left">
          <input
            type="password"
            className="input"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary w-full" disabled={busy || !pw}>
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </form>
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="card p-8 text-center">
      <p className="text-lg font-semibold">Page not found</p>
      <Link to="/" className="btn-primary mt-4">
        Go to Dashboard
      </Link>
    </div>
  )
}
