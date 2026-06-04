import { formatINR, formatDate } from '../utils/format.js'

// transactions: array of txns
// ledgerNames: optional { [ledgerId]: source } map -> shows a "Ledger" column (history view)
// onEdit / onDelete / onToggleImportant: optional action callbacks (hidden when omitted)
export default function ExpenseTable({ transactions, ledgerNames, onEdit, onDelete, onToggleImportant }) {
  const showLedger = !!ledgerNames
  const showActions = !!(onEdit || onDelete || onToggleImportant)

  if (!transactions.length) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500">No transactions yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">Description</th>
            {showLedger && <th className="px-4 py-2 font-medium">Ledger</th>}
            <th className="px-4 py-2 font-medium">Category</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
            {showActions && <th className="no-print px-4 py-2 text-right font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(t.date)}</td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  {t.important && <span title="Important" className="text-amber-500">★</span>}
                  <span className="font-medium text-slate-800">{t.description}</span>
                </div>
                {t.note && <div className="text-xs text-slate-400">{t.note}</div>}
              </td>
              {showLedger && (
                <td className="px-4 py-2.5 text-slate-600">{ledgerNames[t.ledgerId] || '—'}</td>
              )}
              <td className="px-4 py-2.5">
                <span className="badge bg-slate-100 text-slate-600">{t.category}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-slate-800">
                {formatINR(t.amount)}
              </td>
              {showActions && (
                <td className="no-print whitespace-nowrap px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1.5 text-xs">
                    {onToggleImportant && (
                      <button
                        className="rounded px-1.5 py-1 hover:bg-slate-200"
                        title={t.important ? 'Unmark important' : 'Mark important'}
                        onClick={() => onToggleImportant(t)}
                      >
                        {t.important ? '★' : '☆'}
                      </button>
                    )}
                    {onEdit && (
                      <button className="rounded px-1.5 py-1 text-brand-600 hover:bg-brand-50" onClick={() => onEdit(t)}>
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button className="rounded px-1.5 py-1 text-red-600 hover:bg-red-50" onClick={() => onDelete(t)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
