import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import AddTransactionModal from '../components/AddTransactionModal.jsx'
import AddPersonModal from '../components/AddPersonModal.jsx'
import { formatINR, formatDate, formatTime, relativeDay, getInitials, avatarColor, daysAgo, today } from '../utils/format.js'
import { downloadPersonPDF } from '../utils/pdf.js'

// ── Running balance helper ───────────────────────────────────────────────────
function addRunningBalance(txns) {
  // txns is newest-first; compute from oldest-first
  const asc = [...txns].reverse()
  let running = 0
  const map = {}
  for (const t of asc) {
    running += t.type === 'credit' ? Number(t.amount) : -Number(t.amount)
    map[t.id] = running
  }
  return txns.map(t => ({ ...t, runningBalance: map[t.id] }))
}

// ── WhatsApp share ────────────────────────────────────────────────────────────
function shareWhatsApp(person, txns) {
  const bal = Number(person.balance)
  const lines = [
    `*Transaction Buddy*`,
    `Account: ${person.name}`,
    ``,
    bal > 0
      ? `${person.name} owes me Rs.${Math.abs(bal).toLocaleString('en-IN')}`
      : bal < 0
      ? `I owe ${person.name} Rs.${Math.abs(bal).toLocaleString('en-IN')}`
      : `All settled up!`,
    ``,
    `*Recent Entries:*`,
    ...txns.slice(0, 5).map(t =>
      `• ${formatDate(t.date)}: ${t.type === 'credit' ? 'Sent' : 'Received'} Rs.${Number(t.amount).toLocaleString('en-IN')}${t.description ? ` - ${t.description}` : ''}`
    ),
    ``,
    `_Sent via Transaction Buddy_`,
  ]
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
}

// ── Settlement modal ──────────────────────────────────────────────────────────
function SettleModal({ person, onClose, onDone }) {
  const toast = useToast()
  const [method, setMethod] = useState('Cash')
  const [busy, setBusy]     = useState(false)
  const balance = Number(person.balance)
  const amount  = Math.abs(balance)

  const confirm = async () => {
    setBusy(true)
    try {
      // balance > 0: they owe me → I received → debit
      // balance < 0: I owe them → I sent → credit
      await api.createTransaction({
        personId: person.id,
        type: balance > 0 ? 'debit' : 'credit',
        amount,
        description: `Settlement - ${method}`,
        date: today(),
      })
      toast.success('Account settled!')
      onDone()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-brand-800">Mark as Settled</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-brand-300 hover:bg-brand-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className={`rounded-2xl p-4 mb-5 ${balance > 0 ? 'bg-credit-50 border border-credit-100' : 'bg-debit-50 border border-debit-100'}`}>
          <p className="text-xs font-semibold text-brand-400 mb-1">Settlement amount</p>
          <p className={`text-2xl font-extrabold tabular ${balance > 0 ? 'text-credit-700' : 'text-debit-700'}`}>
            {formatINR(amount)}
          </p>
          <p className="text-xs mt-1 text-brand-400">
            {balance > 0 ? `${person.name} pays you this amount` : `You pay ${person.name} this amount`}
          </p>
        </div>

        <div className="mb-5">
          <label className="label">Payment method</label>
          <div className="grid grid-cols-2 gap-2">
            {['Cash', 'UPI', 'Bank Transfer', 'Other'].map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  method === m
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-brand-400 border-brand-200 hover:border-brand-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={confirm} className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Saving...' : 'Confirm Settlement'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function TxnSkeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3,4].map(i => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton h-9 w-9 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3.5 w-36 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton h-4 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PersonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [person, setPerson]           = useState(null)
  const [txns, setTxns]               = useState(null)
  const [showAddTxn, setShowAddTxn]   = useState(false)
  const [editTxn, setEditTxn]         = useState(null)
  const [showEditPerson, setShowEditPerson] = useState(false)
  const [showSettle, setShowSettle]   = useState(false)
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [pdfBusy, setPdfBusy]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const menuRef = useRef(null)

  const loadPerson = () =>
    api.listPersons()
      .then(ps => { const p = ps.find(x => x.id === id); if (p) setPerson(p) })
      .catch(() => {})

  const loadTxns = () =>
    api.listTransactions(id)
      .then(rows => setTxns(addRunningBalance(rows)))
      .catch(e => toast.error(e.message))

  useEffect(() => { loadPerson(); loadTxns() }, [id])

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowPdfMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const refreshAll = () => { loadTxns(); loadPerson() }

  const handleDeleteTxn = async txnId => {
    try { await api.deleteTransaction(txnId); toast.success('Entry deleted'); setConfirmDelete(null); refreshAll() }
    catch (err) { toast.error(err.message) }
  }

  const handleDeletePerson = async () => {
    try { await api.deletePerson(id); toast.success('Contact deleted'); navigate('/') }
    catch (err) { toast.error(err.message) }
  }

  const handleDownloadPDF = async days => {
    if (!person || !txns) return
    setPdfBusy(true); setShowPdfMenu(false)
    try {
      const filtered = days ? txns.filter(t => t.date >= daysAgo(days)) : txns
      await downloadPersonPDF({ person, transactions: filtered, dateLabel: days ? `Last ${days} days` : 'All time' })
      toast.success('PDF downloaded')
    } catch (err) { toast.error('PDF failed: ' + err.message) }
    finally { setPdfBusy(false) }
  }

  const grouped = txns?.reduce((acc, t) => {
    const day = relativeDay(t.date)
    if (!acc[day]) acc[day] = []
    acc[day].push(t)
    return acc
  }, {}) || {}

  const balance    = Number(person?.balance) || 0
  const isPositive = balance > 0
  const isZero     = balance === 0
  const [bg, tc]   = person ? avatarColor(person.name) : ['#2C5EAD', '#C4E2F5']

  return (
    <div className="min-h-dvh pb-6">
      {/* ── Header ── */}
      <div className="bg-brand-gradient safe-top no-print">
        <div className="page-inner pt-3 pb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: bg, color: tc }}>
              {person ? getInitials(person.name) : ''}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-lg leading-tight truncate">{person?.name || ''}</h1>
              {person?.phone && <p className="text-brand-200 text-xs">{person.phone}</p>}
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* WhatsApp */}
              {txns && txns.length > 0 && (
                <button
                  onClick={() => shareWhatsApp(person, txns)}
                  className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  aria-label="Share on WhatsApp"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </button>
              )}
              {/* PDF */}
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowPdfMenu(v => !v)} disabled={pdfBusy} className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                  {pdfBusy
                    ? <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  }
                </button>
                {showPdfMenu && (
                  <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-card-lg border border-brand-100 overflow-hidden z-50 w-40 animate-scale-in">
                    {[7,15,30,null].map(d => (
                      <button key={d ?? 'all'} onClick={() => handleDownloadPDF(d)} className="w-full px-4 py-3 text-sm text-left text-brand-600 font-medium hover:bg-brand-50 border-b border-brand-50 last:border-0">
                        {d ? `Last ${d} days` : 'All time'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Edit */}
              <button onClick={() => setShowEditPerson(true)} className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          </div>

          {/* Balance card */}
          <div className="mt-4 bg-white/15 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">Net Balance</p>
                <p className={`text-white font-extrabold tabular text-2xl mt-0.5 ${isZero ? 'opacity-60' : ''}`}>
                  {isZero ? '0' : formatINR(balance)}
                </p>
                <p className="text-white/70 text-xs mt-1">
                  {isZero ? 'All settled up' : isPositive ? `${person?.name} owes you` : `You owe ${person?.name}`}
                </p>
                {/* Settle button */}
                {!isZero && txns && (
                  <button
                    onClick={() => setShowSettle(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition-colors flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Mark as Settled
                  </button>
                )}
              </div>
              <div className="flex gap-4 ml-4">
                <div className="text-right">
                  <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">Sent</p>
                  <p className="text-credit-300 font-bold tabular text-sm">{formatINR(person?.credits || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">Received</p>
                  <p className="text-debit-300 font-bold tabular text-sm">{formatINR(person?.debits || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Transactions ── */}
      <div className="page-inner pt-4">
        {!txns ? (
          <TxnSkeleton />
        ) : txns.length === 0 ? (
          <div className="card p-8 text-center animate-scale-in">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-50 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2C5EAD" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h3 className="font-bold text-brand-800">No entries yet</h3>
            <p className="text-brand-300 text-sm mt-1">Tap + to add the first entry</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([day, items]) => (
              <div key={day}>
                <p className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-2 px-1">{day}</p>
                <div className="space-y-2">
                  {items.map(t => (
                    <TransactionRow
                      key={t.id}
                      txn={t}
                      onEdit={() => setEditTxn(t)}
                      onDelete={() => setConfirmDelete(t.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {txns && (
          <div className="mt-6 pb-2 no-print">
            <button onClick={() => setConfirmDelete('person')} className="btn-danger w-full">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              Delete Contact &amp; All Entries
            </button>
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setShowAddTxn(true)}
        className="fixed bottom-8 right-4 h-14 w-14 rounded-2xl bg-brand-gradient text-white shadow-fab flex items-center justify-center no-print z-30 active:scale-95 transition-transform"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      {/* ── Modals ── */}
      {showAddTxn && person && (
        <AddTransactionModal personId={id} personName={person.name} onClose={() => setShowAddTxn(false)} onSaved={() => { setShowAddTxn(false); refreshAll() }} />
      )}
      {editTxn && person && (
        <AddTransactionModal personId={id} personName={person.name} transaction={editTxn} onClose={() => setEditTxn(null)} onSaved={() => { setEditTxn(null); refreshAll() }} />
      )}
      {showEditPerson && person && (
        <AddPersonModal person={person} onClose={() => setShowEditPerson(false)} onSaved={() => { setShowEditPerson(false); loadPerson() }} />
      )}
      {showSettle && person && (
        <SettleModal person={person} onClose={() => setShowSettle(false)} onDone={() => { setShowSettle(false); refreshAll() }} />
      )}

      {/* ── Confirm delete ── */}
      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="modal-sheet animate-scale-in max-w-xs">
            <h3 className="font-bold text-brand-800 text-lg">
              {confirmDelete === 'person' ? 'Delete Contact?' : 'Delete Entry?'}
            </h3>
            <p className="text-brand-400 text-sm mt-1">
              {confirmDelete === 'person'
                ? `This will permanently delete ${person?.name} and all their entries.`
                : 'This entry will be permanently deleted.'}
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => confirmDelete === 'person' ? handleDeletePerson() : handleDeleteTxn(confirmDelete)}
                className="btn-danger flex-1"
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Transaction row ────────────────────────────────────────────────────────────
function TransactionRow({ txn, onEdit, onDelete }) {
  const isSent = txn.type === 'credit'
  const rb     = txn.runningBalance
  const rbPos  = rb >= 0

  return (
    <div className="card p-3.5 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isSent ? 'bg-credit-50' : 'bg-debit-50'}`}>
          {isSent
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-brand-700 font-medium text-sm truncate leading-tight">
            {txn.description || (isSent ? 'Sent' : 'Received')}
          </p>
          <p className="text-brand-300 text-xs mt-0.5">
            {formatDate(txn.date)}
            {txn.createdAt && <span className="ml-1.5 text-brand-200">· {formatTime(txn.createdAt)}</span>}
          </p>
        </div>

        {/* Amount + running balance */}
        <div className="text-right flex-shrink-0">
          <p className={`font-bold tabular text-sm ${isSent ? 'text-credit-600' : 'text-debit-600'}`}>
            {formatINR(txn.amount)}
          </p>
          {rb !== undefined && (
            <p className={`text-[10px] tabular font-medium mt-0.5 ${rbPos ? 'text-credit-500' : 'text-debit-500'}`}>
              Bal: {formatINR(Math.abs(rb))}
            </p>
          )}
        </div>

        <div className="flex gap-1 flex-shrink-0 no-print">
          <button onClick={onEdit} className="h-7 w-7 rounded-lg flex items-center justify-center text-brand-200 hover:text-brand-400 hover:bg-brand-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={onDelete} className="h-7 w-7 rounded-lg flex items-center justify-center text-brand-200 hover:bg-debit-50 hover:text-debit-500 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
