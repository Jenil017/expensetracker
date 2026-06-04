import { formatINR, daysLeft } from '../utils/format.js'

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${accent || 'text-slate-900'}`}>{value}</div>
    </div>
  )
}

// Expects a summarized ledger: { amount, spent, remaining, txnCount, expectedTxnMin/Max, deadline, status }
export default function SummaryBar({ ledger }) {
  const amount = Number(ledger.amount) || 0
  const spent = Number(ledger.spent) || 0
  const pct = amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : 0
  const over = ledger.remaining < 0
  const days = daysLeft(ledger.deadline)

  const expected =
    ledger.expectedTxnMin || ledger.expectedTxnMax
      ? `${ledger.expectedTxnMin || 0}–${ledger.expectedTxnMax || 0}`
      : null

  return (
    <div className="card p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Given" value={formatINR(amount)} />
        <Stat label="Spent" value={formatINR(spent)} accent="text-amber-600" />
        <Stat
          label="Remaining"
          value={formatINR(ledger.remaining)}
          accent={over ? 'text-red-600' : 'text-emerald-600'}
        />
        <Stat
          label="Transactions"
          value={expected ? `${ledger.txnCount} / ${expected}` : ledger.txnCount}
        />
      </div>

      <div className="mt-4">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-brand-600'}`}
            style={{ width: `${over ? 100 : pct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{pct}% spent</span>
          {days != null && (
            <span className={days < 0 ? 'text-red-600' : days <= 1 ? 'text-amber-600' : ''}>
              {days < 0 ? `${Math.abs(days)} day(s) overdue` : days === 0 ? 'Due today' : `${days} day(s) left`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
