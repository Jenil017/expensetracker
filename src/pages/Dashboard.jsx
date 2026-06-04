import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { formatINR } from '../utils/format.js'
import LedgerCard from '../components/LedgerCard.jsx'

export default function Dashboard() {
  const [ledgers, setLedgers] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .listLedgers()
      .then(setLedgers)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <ErrorBox message={error} />
  if (!ledgers) return <p className="py-10 text-center text-slate-500">Loading…</p>

  const active = ledgers.filter((l) => l.status !== 'closed')
  const totalRemaining = active.reduce((s, l) => s + (Number(l.remaining) || 0), 0)
  const totalGiven = active.reduce((s, l) => s + (Number(l.amount) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {active.length} active ledger(s) · {formatINR(totalRemaining)} remaining of {formatINR(totalGiven)}
          </p>
        </div>
        <Link to="/ledgers/new" className="btn-primary">
          + New ledger
        </Link>
      </div>

      {ledgers.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-semibold text-slate-800">No ledgers yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            A ledger is one batch of money you received from someone (e.g. your brother gave you ₹1,50,000).
            Create one, then log each expense against it.
          </p>
          <Link to="/ledgers/new" className="btn-primary mt-4">
            + Create your first ledger
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ledgers.map((l) => (
            <LedgerCard key={l.id} ledger={l} />
          ))}
        </div>
      )}
    </div>
  )
}

function ErrorBox({ message }) {
  return (
    <div className="card border-red-200 bg-red-50 p-5 text-red-700">
      <p className="font-medium">Something went wrong</p>
      <p className="text-sm">{message}</p>
      <p className="mt-2 text-xs text-red-500">
        Check your Firebase config and that Firestore is enabled for your account.
      </p>
    </div>
  )
}
