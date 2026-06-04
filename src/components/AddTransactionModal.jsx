import { useState } from 'react'
import { api } from '../api.js'
import { useToast } from './Toast.jsx'
import { today } from '../utils/format.js'

export default function AddTransactionModal({ personId, personName, onClose, onSaved, transaction }) {
  const toast = useToast()
  // credit = I sent money (they owe me, green, to collect)
  // debit  = I received money (I owe them, red, to pay)
  const [type, setType] = useState(transaction?.type || 'credit')
  const [form, setForm] = useState({
    amount: transaction?.amount?.toString() || '',
    description: transaction?.description || '',
    date: transaction?.date || today(),
  })
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) return toast.error('Enter a valid amount')
    setBusy(true)
    try {
      const payload = { ...form, amount, type, personId }
      const saved = transaction
        ? await api.updateTransaction(transaction.id, { type, amount, description: form.description, date: form.date })
        : await api.createTransaction(payload)
      toast.success(transaction ? 'Entry updated' : 'Entry added')
      onSaved(saved)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-brand-800">{transaction ? 'Edit Entry' : 'New Entry'}</h2>
            <p className="text-xs text-brand-300 mt-0.5">{personName}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-brand-300 hover:bg-brand-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Type toggle: Sent = credit (green), Received = debit (red) */}
        <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-brand-50 rounded-2xl">
          <button
            type="button"
            onClick={() => setType('credit')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              type === 'credit'
                ? 'bg-credit-gradient text-white shadow-sm'
                : 'text-brand-300 hover:text-credit-600'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Sent
          </button>
          <button
            type="button"
            onClick={() => setType('debit')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              type === 'debit'
                ? 'bg-debit-gradient text-white shadow-sm'
                : 'text-brand-300 hover:text-debit-600'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Received
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Amount (Rs.)</label>
            <input
              className="input tabular text-lg font-bold"
              placeholder="0.00"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={set('amount')}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input
              className="input"
              placeholder={type === 'credit' ? 'e.g. Sent for groceries' : 'e.g. Received payment'}
              value={form.description}
              onChange={set('description')}
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={set('date')}
              max={today()}
            />
          </div>

          {form.amount && (
            <div className={`rounded-xl p-3 text-sm font-medium border ${
              type === 'credit'
                ? 'bg-credit-50 text-credit-700 border-credit-100'
                : 'bg-debit-50 text-debit-700 border-debit-100'
            }`}>
              {type === 'credit'
                ? `You sent Rs.${form.amount} to ${personName} — they owe you`
                : `You received Rs.${form.amount} from ${personName} — you owe them`}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              type="submit"
              className={`flex-1 btn ${type === 'credit' ? 'btn-credit' : 'btn-debit'}`}
              disabled={busy}
            >
              {busy ? 'Saving...' : transaction ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
