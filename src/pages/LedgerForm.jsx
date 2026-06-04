import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../api.js'
import { todayISODate } from '../utils/format.js'

const blank = {
  source: '',
  amount: '',
  dateReceived: todayISODate(),
  purpose: '',
  expectedTxnMin: '',
  expectedTxnMax: '',
  deadline: '',
  note: '',
}

export default function LedgerForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    api
      .getLedger(id)
      .then(({ ledger }) =>
        setForm({
          source: ledger.source || '',
          amount: ledger.amount ?? '',
          dateReceived: ledger.dateReceived || todayISODate(),
          purpose: ledger.purpose || '',
          expectedTxnMin: ledger.expectedTxnMin || '',
          expectedTxnMax: ledger.expectedTxnMax || '',
          deadline: ledger.deadline || '',
          note: ledger.note || '',
        }),
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.source.trim()) return setError('Enter who gave you the money')
    if (!(Number(form.amount) > 0)) return setError('Enter an amount greater than 0')
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        expectedTxnMin: Number(form.expectedTxnMin) || 0,
        expectedTxnMax: Number(form.expectedTxnMax) || 0,
      }
      const saved = isEdit ? await api.updateLedger(id, payload) : await api.createLedger(payload)
      navigate(`/ledgers/${saved.id}`)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (loading) return <p className="py-10 text-center text-slate-500">Loading…</p>

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link to={isEdit ? `/ledgers/${id}` : '/'} className="text-sm text-brand-600 hover:underline">
          ← Back
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{isEdit ? 'Edit ledger' : 'New ledger'}</h1>
        <p className="text-sm text-slate-500">Record a batch of money you received and what it's for.</p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Received from</label>
            <input className="input" placeholder="e.g. Brother" value={form.source} onChange={set('source')} autoFocus />
          </div>
          <div>
            <label className="label">Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              className="input"
              placeholder="150000"
              value={form.amount}
              onChange={set('amount')}
            />
          </div>
        </div>

        <div>
          <label className="label">Purpose</label>
          <input
            className="input"
            placeholder="e.g. Site material purchases"
            value={form.purpose}
            onChange={set('purpose')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Date received</label>
            <input type="date" className="input" value={form.dateReceived} onChange={set('dateReceived')} />
          </div>
          <div>
            <label className="label">Deadline (optional)</label>
            <input type="date" className="input" value={form.deadline} onChange={set('deadline')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Expected transactions — min</label>
            <input
              type="number"
              min="0"
              className="input"
              placeholder="20"
              value={form.expectedTxnMin}
              onChange={set('expectedTxnMin')}
            />
          </div>
          <div>
            <label className="label">Expected transactions — max</label>
            <input
              type="number"
              min="0"
              className="input"
              placeholder="35"
              value={form.expectedTxnMax}
              onChange={set('expectedTxnMax')}
            />
          </div>
        </div>

        <div>
          <label className="label">Note (optional)</label>
          <input className="input" value={form.note} onChange={set('note')} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Link to={isEdit ? `/ledgers/${id}` : '/'} className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create ledger'}
          </button>
        </div>
      </form>
    </div>
  )
}
