import { Link } from 'react-router-dom'
import { formatINR, formatDate, daysLeft } from '../utils/format.js'

export default function LedgerCard({ ledger }) {
  const amount = Number(ledger.amount) || 0
  const spent = Number(ledger.spent) || 0
  const pct = amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : 0
  const over = ledger.remaining < 0
  const days = daysLeft(ledger.deadline)
  const closed = ledger.status === 'closed'

  return (
    <Link to={`/ledgers/${ledger.id}`} className="card block p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900">{ledger.source}</h3>
            <span
              className={`badge ${closed ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}
            >
              {closed ? 'Closed' : 'Active'}
            </span>
          </div>
          {ledger.purpose && <p className="truncate text-sm text-slate-500">{ledger.purpose}</p>}
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Remaining</div>
          <div className={`text-lg font-bold ${over ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatINR(ledger.remaining)}
          </div>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-brand-600'}`}
          style={{ width: `${over ? 100 : pct}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          {formatINR(spent)} of {formatINR(amount)}
        </span>
        <span>
          {ledger.txnCount}
          {ledger.expectedTxnMin || ledger.expectedTxnMax
            ? ` / ${ledger.expectedTxnMin || 0}–${ledger.expectedTxnMax || 0}`
            : ''}{' '}
          txns
        </span>
        {ledger.deadline && (
          <span className={days != null && days < 0 ? 'text-red-600' : ''}>
            {closed
              ? `Recd ${formatDate(ledger.dateReceived)}`
              : days != null && days < 0
                ? `${Math.abs(days)}d overdue`
                : days === 0
                  ? 'Due today'
                  : `${days}d left`}
          </span>
        )}
      </div>
    </Link>
  )
}
