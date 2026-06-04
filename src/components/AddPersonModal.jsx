import { useState } from 'react'
import { api } from '../api.js'
import { useToast } from './Toast.jsx'

export default function AddPersonModal({ onClose, onSaved, person }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: person?.name || '',
    phone: person?.phone || '',
    note: person?.note || '',
  })
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name is required')
    setBusy(true)
    try {
      const saved = person
        ? await api.updatePerson(person.id, form)
        : await api.createPerson(form)
      toast.success(person ? 'Contact updated' : 'Contact added')
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
          <h2 className="text-lg font-bold text-brand-800">{person ? 'Edit Contact' : 'Add New Contact'}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-brand-300 hover:bg-brand-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              placeholder="e.g. Pm Modi"
              value={form.name}
              onChange={set('name')}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input
              className="input"
              placeholder="e.g. 9876543210"
              type="tel"
              value={form.phone}
              onChange={set('phone')}
            />
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input
              className="input"
              placeholder="e.g. Shop owner, brother, etc."
              value={form.note}
              onChange={set('note')}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={busy}>
              {busy ? 'Saving…' : person ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
