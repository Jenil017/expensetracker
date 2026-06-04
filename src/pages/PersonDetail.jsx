import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import AddTransactionModal from '../components/AddTransactionModal.jsx'
import AddPersonModal from '../components/AddPersonModal.jsx'
import { formatINR, formatDate, formatTime, relativeDay, getInitials, avatarColor, daysAgo } from '../utils/format.js'
import { downloadPersonPDF } from '../utils/pdf.js'

function TxnSkeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3,4].map(i => (
        <div key={i} className="flex items-center gap-3 px-1">
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

export default function PersonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [person, setPerson] = useState(null)
  const [txns, setTxns] = useState(null)
  const [showAddTxn, setShowAddTxn] = useState(false)
  const [editTxn, setEditTxn] = useState(null)
  const [showEditPerson, setShowEditPerson] = useState(false)
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const menuRef = useRef(null)

  const loadPerson = () => api.listPersons().then(ps => {
    const p = ps.find(x => x.id === id)
    if (p) setPerson(p)
  }).catch(() => {})

  const loadTxns = () => api.listTransactions(id)
    .then(setTxns)
    .catch(e => toast.error(e.message))

  useEffect(() => {
    loadPerson()
    loadTxns()
  }, [id])

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowPdfMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleTxnSaved = () => {
    setShowAddTxn(false)
    setEditTxn(null)
    loadTxns()
    loadPerson()
  }

  const handleDeleteTxn = async (txnId) => {
    try {
      await api.deleteTransaction(txnId)
      toast.success('Entry deleted')
      setShowDeleteConfirm(null)
      loadTxns()
      loadPerson()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeletePerson = async () => {
    try {
      await api.deletePerson(id)
      toast.success('Contact deleted')
      navigate('/')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDownloadPDF = async (days) => {
    if (!person || !txns) return
    setPdfBusy(true)
    setShowPdfMenu(false)
    try {
      let filtered = txns
      let dateLabel = 'All time'
      if (days) {
        const cutoff = daysAgo(days)
        filtered = txns.filter(t => t.date >= cutoff)
        dateLabel = `Last ${days} days`
      }
      await downloadPersonPDF({ person, transactions: filtered, dateLabel })
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error('PDF failed: ' + err.message)
    } finally {
      setPdfBusy(false)
    }
  }

  const grouped = txns?.reduce((acc, t) => {
    const day = relativeDay(t.date)
    if (!acc[day]) acc[day] = []
    acc[day].push(t)
    return acc
  }, {}) || {}

  const balance = Number(person?.balance) || 0
  const isPositive = balance > 0
  const isZero = balance === 0

  const [bg, textColor] = person ? avatarColor(person.name) : ['#2C5EAD', '#C4E2F5']

  return (
    <div className="min-h-dvh pb-6">
      {/* Header */}
      <div className="bg-brand-gradient safe-top no-print">
        <div className="page-inner pt-3 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors flex-shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: bg, color: textColor }}>
              {person ? getInitials(person.name) : ''}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-lg leading-tight truncate">{person?.name || ''}</h1>
              {person?.phone && <p className="text-brand-200 text-xs">{person.phone}</p>}
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowPdfMenu(v => !v)}
                  disabled={pdfBusy}
                  className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  aria-label="Download PDF"
                >
                  {pdfBusy
                    ? <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  }
                </button>
                {showPdfMenu && (
                  <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-card-lg border border-brand-100 overflow-hidden z-50 w-40 animate-scale-in">
                    {[7, 15, 30, null].map(d => (
                      <button
                        key={d ?? 'all'}
                        onClick={() => handleDownloadPDF(d)}
                        className="w-full px-4 py-3 text-sm text-left text-brand-600 font-medium hover:bg-brand-50 transition-colors border-b border-brand-50 last:border-0"
                      >
                        {d ? `Last ${d} days` : 'All time'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowEditPerson(true)}
                className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          </div>

          {/* Balance card */}
          <div className="mt-4 bg-white/15 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Net Balance</p>
                <p className={`text-white font-extrabold tabular text-2xl mt-0.5 ${isZero ? 'opacity-60' : ''}`}>
                  {isZero ? '0' : formatINR(balance)}
                </p>
                <p className="text-white/70 text-xs mt-1">
                  {isZero ? 'All settled up' : isPositive ? `${person?.name} owes you` : `You owe ${person?.name}`}
                </p>
              </div>
              <div className="flex gap-4">
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

      {/* Transactions list */}
      <div className="page-inner pt-4 print-area">
        <div className="hidden print:block mb-4">
          <h2 className="text-lg font-bold">Transaction Buddy — {person?.name}</h2>
          <p className="text-sm text-gray-500">All transactions · Generated {new Date().toLocaleDateString('en-IN')}</p>
        </div>

        {!txns ? (
          <TxnSkeleton />
        ) : txns.length === 0 ? (
          <div className="card p-8 text-center animate-scale-in">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-50 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2C5EAD" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <h3 className="font-bold text-brand-800">No entries yet</h3>
            <p className="text-brand-300 text-sm mt-1">Add your first entry below</p>
            <button onClick={() => setShowAddTxn(true)} className="btn-primary mt-4">Add Entry</button>
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
                      onDelete={() => setShowDeleteConfirm(t.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {txns && (
        <div className="page-inner mt-6 pb-4 no-print">
          <button onClick={() => setShowDeleteConfirm('person')} className="btn-danger w-full">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Delete Contact &amp; All Entries
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAddTxn(true)}
        className="fixed bottom-8 right-4 h-14 w-14 rounded-2xl bg-brand-gradient text-white shadow-fab flex items-center justify-center no-print z-30 transition-transform active:scale-95"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      {showAddTxn && person && (
        <AddTransactionModal personId={id} personName={person.name} onClose={() => setShowAddTxn(false)} onSaved={handleTxnSaved} />
      )}
      {editTxn && person && (
        <AddTransactionModal personId={id} personName={person.name} transaction={editTxn} onClose={() => setEditTxn(null)} onSaved={handleTxnSaved} />
      )}
      {showEditPerson && person && (
        <AddPersonModal person={person} onClose={() => setShowEditPerson(false)} onSaved={() => { setShowEditPerson(false); loadPerson() }} />
      )}

      {showDeleteConfirm && (
        <div className="modal-backdrop">
          <div className="modal-sheet animate-scale-in max-w-xs">
            <h3 className="font-bold text-brand-800 text-lg">
              {showDeleteConfirm === 'person' ? 'Delete Contact?' : 'Delete Entry?'}
            </h3>
            <p className="text-brand-400 text-sm mt-1">
              {showDeleteConfirm === 'person'
                ? `This will permanently delete ${person?.name} and all entries.`
                : 'This entry will be permanently deleted.'}
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => showDeleteConfirm === 'person' ? handleDeletePerson() : handleDeleteTxn(showDeleteConfirm)}
                className="btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TransactionRow({ txn, onEdit, onDelete }) {
  const isSent = txn.type === 'credit'  // I sent → they owe me → green
  return (
    <div className="card p-3.5 flex items-center gap-3 animate-fade-up">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isSent ? 'bg-credit-50' : 'bg-debit-50'}`}>
        {isSent
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
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

      <p className={`font-bold tabular text-sm flex-shrink-0 ${isSent ? 'text-credit-600' : 'text-debit-600'}`}>
        {formatINR(txn.amount)}
      </p>

      <div className="flex gap-1 flex-shrink-0 no-print">
        <button onClick={onEdit} className="h-7 w-7 rounded-lg flex items-center justify-center text-brand-200 hover:text-brand-400 hover:bg-brand-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button onClick={onDelete} className="h-7 w-7 rounded-lg flex items-center justify-center text-brand-200 hover:bg-debit-50 hover:text-debit-500 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>
  )
}
