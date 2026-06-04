import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { formatINR, formatDate } from '../utils/format.js'
import SummaryBar from '../components/SummaryBar.jsx'
import ExpenseForm from '../components/ExpenseForm.jsx'
import ExpenseTable from '../components/ExpenseTable.jsx'

export default function LedgerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  // filters
  const [category, setCategory] = useState('')
  const [importantOnly, setImportantOnly] = useState(false)

  const reload = () =>
    api
      .getLedger(id)
      .then(setData)
      .catch((e) => setError(e.message))

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const categories = useMemo(() => {
    if (!data) return []
    return [...new Set(data.transactions.map((t) => t.category))].sort()
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.transactions.filter(
      (t) => (!category || t.category === category) && (!importantOnly || t.important),
    )
  }, [data, category, importantOnly])

  if (error) return <div className="card border-red-200 bg-red-50 p-5 text-red-700">{error}</div>
  if (!data) return <p className="py-10 text-center text-slate-500">Loading…</p>

  const { ledger } = data
  const closed = ledger.status === 'closed'

  const saveExpense = async (payload) => {
    setSaving(true)
    try {
      if (editing) {
        await api.updateTransaction(editing.id, { ...payload, ledgerId: id })
      } else {
        await api.createTransaction({ ...payload, ledgerId: id })
      }
      setShowForm(false)
      setEditing(null)
      await reload()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteExpense = async (t) => {
    if (!confirm(`Delete "${t.description}" (${formatINR(t.amount)})?`)) return
    await api.deleteTransaction(t.id)
    await reload()
  }

  const toggleImportant = async (t) => {
    await api.updateTransaction(t.id, { ...t, important: !t.important })
    await reload()
  }

  const toggleClosed = async () => {
    await api.updateLedger(id, { status: closed ? 'active' : 'closed' })
    await reload()
  }

  const deleteLedger = async () => {
    if (!confirm(`Delete the ledger "${ledger.source}" and ALL its ${ledger.txnCount} transactions? This cannot be undone.`))
      return
    await api.deleteLedger(id)
    navigate('/')
  }

  const startEdit = (t) => {
    setEditing(t)
    setShowForm(true)
  }
  const startAdd = () => {
    setEditing(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/" className="text-sm text-brand-600 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{ledger.source}</h1>
          <p className="text-sm text-slate-500">
            {ledger.purpose ? ledger.purpose + ' · ' : ''}Received {formatDate(ledger.dateReceived)}
            {ledger.deadline ? ` · Due ${formatDate(ledger.deadline)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/hisab/${id}`} className="btn-primary">
            View Hisab
          </Link>
          <Link to={`/ledgers/${id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <button className="btn-secondary" onClick={toggleClosed}>
            {closed ? 'Reopen' : 'Close'}
          </button>
          <button className="btn-danger" onClick={deleteLedger}>
            Delete
          </button>
        </div>
      </div>

      <SummaryBar ledger={ledger} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
              checked={importantOnly}
              onChange={(e) => setImportantOnly(e.target.checked)}
            />
            Important only
          </label>
        </div>
        <button className="btn-primary" onClick={startAdd}>
          + Add expense
        </button>
      </div>

      {showForm && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            {editing ? 'Edit expense' : 'Add expense'}
          </h2>
          <ExpenseForm
            initial={editing}
            saving={saving}
            onSave={saveExpense}
            onCancel={() => {
              setShowForm(false)
              setEditing(null)
            }}
          />
        </div>
      )}

      <div className="card">
        <ExpenseTable
          transactions={filtered}
          onEdit={startEdit}
          onDelete={deleteExpense}
          onToggleImportant={toggleImportant}
        />
      </div>
    </div>
  )
}
