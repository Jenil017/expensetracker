import { useState } from 'react'
import { api } from '../api.js'
import { useToast } from './Toast.jsx'
import { today, EXPENSE_CATEGORIES } from '../utils/format.js'

export default function AddExpenseModal({ onClose, onSaved, expense }) {
  const toast = useToast()
  const [form, setForm] = useState({
    amount: expense?.amount?.toString() || '',
    category: expense?.category || 'Other',
    description: expense?.description || '',
    date: expense?.date || today(),
  })
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) return toast.error('Enter a valid amount')
    setBusy(true)
    try {
      const saved = expense
        ? await api.updateExpense(expense.id, { ...form, amount })
        : await api.createExpense({ ...form, amount })
      toast.success(expense ? 'Expense updated' : 'Expense added')
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-brand-800">{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-brand-300 hover:bg-brand-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Amount (₹) *</label>
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
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={set('category')}>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Description</label>
            <input
              className="input"
              placeholder="What was this for?"
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

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={busy}>
              {busy ? 'Saving…' : expense ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
