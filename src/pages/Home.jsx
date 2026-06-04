import { useState, useEffect } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useToast } from '../components/Toast.jsx'
import PersonCard from '../components/PersonCard.jsx'
import AddPersonModal from '../components/AddPersonModal.jsx'
import { formatINR } from '../utils/format.js'

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="card p-4 flex items-center gap-3">
          <div className="skeleton h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-32 rounded-lg" />
            <div className="skeleton h-3 w-20 rounded-lg" />
          </div>
          <div className="skeleton h-5 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const toast = useToast()
  const [persons, setPersons] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  const load = () => {
    api.listPersons()
      .then(setPersons)
      .catch(e => toast.error(e.message))
  }

  useEffect(load, [])

  const filtered = persons?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  ) || []

  const totalToCollect = persons?.filter(p => p.balance > 0).reduce((s, p) => s + p.balance, 0) || 0
  const totalToPay     = persons?.filter(p => p.balance < 0).reduce((s, p) => s + Math.abs(p.balance), 0) || 0

  return (
    <div className="page">
      {/* Header */}
      <div className="bg-brand-gradient safe-top">
        <div className="page-inner pt-4 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-brand-200 text-xs font-medium">{timeGreeting()}</p>
              <h1 className="text-white font-extrabold text-xl mt-0.5">
                {user?.name?.split(' ')[0] || 'My Buddy'}
              </h1>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              aria-label="Add contact"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>

          {persons && persons.length > 0 && (
            <div className="flex gap-2 mt-4">
              <div className="flex-1 bg-white/15 rounded-xl px-3 py-2">
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wide">To Collect</p>
                <p className="text-white font-bold tabular text-base">{formatINR(totalToCollect)}</p>
              </div>
              <div className="flex-1 bg-white/15 rounded-xl px-3 py-2">
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wide">To Pay</p>
                <p className="text-white font-bold tabular text-base">{formatINR(totalToPay)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="page-inner pt-4 space-y-4">
        {persons && persons.length > 0 && (
          <div className="relative animate-fade-up">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="input pl-10"
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {!persons ? (
          <Skeleton />
        ) : persons.length === 0 ? (
          <div className="card p-8 text-center animate-scale-in mt-4">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-50 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2C5EAD" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h2 className="text-lg font-bold text-brand-800">No contacts yet</h2>
            <p className="text-brand-300 text-sm mt-1 max-w-xs mx-auto">
              Add a person to start tracking money sent and received.
            </p>
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add First Contact
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-brand-300 text-sm">No contacts match "{search}"</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((p, i) => <PersonCard key={p.id} person={p} index={i} />)}
          </div>
        )}
      </div>

      {persons && persons.length > 0 && (
        <button
          onClick={() => setShowAdd(true)}
          className="fixed bottom-24 right-4 h-14 w-14 rounded-2xl bg-brand-gradient text-white shadow-fab flex items-center justify-center no-print z-30 transition-transform active:scale-95"
          aria-label="Add contact"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}

      {showAdd && (
        <AddPersonModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />
      )}
    </div>
  )
}
