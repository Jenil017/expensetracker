import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { formatINR } from '../utils/format.js'
import ExpenseTable from '../components/ExpenseTable.jsx'

export default function Search() {
  const [ledgers, setLedgers] = useState([])
  const [txns, setTxns] = useState(null)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [importantOnly, setImportantOnly] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    Promise.all([api.listLedgers(), api.listTransactions()])
      .then(([l, t]) => {
        setLedgers(l)
        setTxns(t)
      })
      .catch((e) => setError(e.message))
  }, [])

  const ledgerNames = useMemo(() => Object.fromEntries(ledgers.map((l) => [l.id, l.source])), [ledgers])
  const categories = useMemo(() => (txns ? [...new Set(txns.map((t) => t.category))].sort() : []), [txns])

  const filtered = useMemo(() => {
    if (!txns) return []
    const needle = q.trim().toLowerCase()
    return txns.filter((t) => {
      if (category && t.category !== category) return false
      if (importantOnly && !t.important) return false
      if (from && t.date < from) return false
      if (to && t.date > to) return false
      if (needle) {
        const hay = `${t.description} ${t.category} ${t.note || ''} ${ledgerNames[t.ledgerId] || ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [txns, q, category, importantOnly, from, to, ledgerNames])

  const total = filtered.reduce((s, t) => s + (Number(t.amount) || 0), 0)

  if (error) return <div className="card border-red-200 bg-red-50 p-5 text-red-700">{error}</div>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">History</h1>
        <p className="text-sm text-slate-500">Search and filter all transactions across every ledger.</p>
      </div>

      <div className="card space-y-3 p-4">
        <input
          className="input"
          placeholder="Search description, category, note or ledger…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div>
            <span className="mb-1 block text-xs text-slate-400">From</span>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <span className="mb-1 block text-xs text-slate-400">To</span>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
              checked={importantOnly}
              onChange={(e) => setImportantOnly(e.target.checked)}
            />
            Important only
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{filtered.length} transaction(s)</span>
        <span className="font-semibold">Total: {formatINR(total)}</span>
      </div>

      <div className="card">
        {txns === null ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Loading…</p>
        ) : (
          <ExpenseTable transactions={filtered} ledgerNames={ledgerNames} />
        )}
      </div>
    </div>
  )
}
