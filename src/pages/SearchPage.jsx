import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { formatINR, formatDate, getInitials, avatarColor } from '../utils/format.js'

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

export default function SearchPage() {
  const navigate  = useNavigate()
  const inputRef  = useRef(null)
  const [q, setQ]           = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const dq = useDebounce(q.trim(), 350)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!dq) { setResults(null); setError(''); return }
    setLoading(true)
    setError('')
    api.search(dq)
      .then(data => { setResults(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [dq])

  const total = (results?.persons.length || 0) + (results?.transactions.length || 0)

  return (
    <div className="min-h-dvh bg-brand-50">
      {/* Search bar */}
      <div className="bg-white border-b border-brand-100 safe-top sticky top-0 z-10">
        <div className="page-inner py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-brand-400 hover:bg-brand-50 transition-colors flex-shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>

          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              ref={inputRef}
              className="input pl-9 pr-10"
              placeholder="Name, description or amount..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            {q && (
              <button
                onClick={() => { setQ(''); setResults(null) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-300 hover:text-brand-500"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page-inner py-4 space-y-5">

        {/* Idle state */}
        {!q && (
          <div className="text-center pt-16">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-100 flex items-center justify-center mb-3">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2C5EAD" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p className="font-semibold text-brand-700">Search everything</p>
            <p className="text-brand-300 text-sm mt-1">Contact names, descriptions, amounts</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card p-4 border-debit-100 bg-debit-50 text-debit-700 text-sm font-medium">
            Search failed: {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2.5">
            {[1,2,3,4].map(i => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <div className="skeleton h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-32 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
                <div className="skeleton h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && !error && dq && results && total === 0 && (
          <div className="text-center pt-10">
            <div className="mx-auto h-12 w-12 rounded-xl bg-brand-100 flex items-center justify-center mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#93CAED" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p className="font-semibold text-brand-600">No results for "{dq}"</p>
            <p className="text-brand-300 text-sm mt-1">Try a different name, description or amount</p>
          </div>
        )}

        {/* Persons */}
        {!loading && results?.persons.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-2">
              Contacts ({results.persons.length})
            </p>
            <div className="space-y-2">
              {results.persons.map(p => {
                const [bg, tc] = avatarColor(p.name)
                const bal = Number(p.balance)
                return (
                  <Link key={p.id} to={`/persons/${p.id}`} className="card card-hover p-3.5 flex items-center gap-3 block">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: bg, color: tc }}>
                      {getInitials(p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-800 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-brand-300">{p.txnCount || 0} entries</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold tabular text-sm ${bal > 0 ? 'text-credit-600' : bal < 0 ? 'text-debit-600' : 'text-brand-300'}`}>
                        {formatINR(bal)}
                      </p>
                      <p className={`text-[10px] font-semibold ${bal > 0 ? 'text-credit-500' : bal < 0 ? 'text-debit-500' : 'text-brand-200'}`}>
                        {bal > 0 ? 'To Collect' : bal < 0 ? 'To Pay' : 'Settled'}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Transactions */}
        {!loading && results?.transactions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-2">
              Transactions ({results.transactions.length})
            </p>
            <div className="space-y-2">
              {results.transactions.map(t => {
                const isSent = t.type === 'credit'
                return (
                  <Link key={t.id} to={`/persons/${t.personId}`} className="card card-hover p-3.5 flex items-center gap-3 block">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isSent ? 'bg-credit-50' : 'bg-debit-50'}`}>
                      {isSent
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-700 truncate">
                        {t.description || (isSent ? 'Sent' : 'Received')}
                      </p>
                      <p className="text-xs text-brand-300 mt-0.5">
                        {t.personName} · {formatDate(t.date)}
                      </p>
                    </div>
                    <p className={`font-bold tabular text-sm flex-shrink-0 ${isSent ? 'text-credit-600' : 'text-debit-600'}`}>
                      {formatINR(t.amount)}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
