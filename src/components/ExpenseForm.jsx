import { useState } from 'react'
import { CATEGORIES, todayISODate } from '../utils/format.js'

export default function ExpenseForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    amount: initial?.amount ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? 'Misc',
    date: initial?.date ?? todayISODate(),
    important: initial?.important ?? false,
    note: initial?.note ?? '',
  })
  const [error, setError] = useState('')

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: val }))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!(Number(form.amount) > 0)) return setError('Enter an amount greater than 0')
    if (!form.description.trim()) return setError('Enter what the money was spent on')
    setError('')
    onSave({ ...form, amount: Number(form.amount) })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Amount (₹)</label>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            className="input"
            value={form.amount}
            onChange={set('amount')}
            autoFocus
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={form.date} onChange={set('date')} />
        </div>
      </div>

      <div>
        <label className="label">Spent on (description)</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. Cement 10 bags"
          value={form.description}
          onChange={set('description')}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Category</label>
          <input
            type="text"
            list="category-list"
            className="input"
            value={form.category}
            onChange={set('category')}
          />
          <datalist id="category-list">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={form.important}
              onChange={set('important')}
            />
            Mark as important
          </label>
        </div>
      </div>

      <div>
        <label className="label">Note (optional)</label>
        <input type="text" className="input" value={form.note} onChange={set('note')} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </form>
  )
}
