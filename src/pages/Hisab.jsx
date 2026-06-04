import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api.js'
import { formatINR, formatDate, todayISODate } from '../utils/format.js'

export default function Hisab() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getLedger(id)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="card border-red-200 bg-red-50 p-5 text-red-700">{error}</div>
  if (!data) return <p className="py-10 text-center text-slate-500">Loading…</p>

  const { ledger } = data
  // Chronological order for a statement.
  const txns = [...data.transactions].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt < b.createdAt ? -1 : 1,
  )
  const over = ledger.remaining < 0

  return (
    <div className="space-y-4">
      {/* Toolbar — hidden when printing */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link to={`/ledgers/${id}`} className="text-sm text-brand-600 hover:underline">
          ← Back to ledger
        </Link>
        <button className="btn-primary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      {/* The statement */}
      <div className="print-area card mx-auto max-w-3xl p-8">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Hisab Statement</h1>
            <p className="text-sm text-slate-500">Expense account / accounting statement</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <div>
              <span className="text-slate-400">Generated:</span> {formatDate(todayISODate())}
            </div>
            <div>
              <span className="text-slate-400">Status:</span> {ledger.status === 'closed' ? 'Closed' : 'Active'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-2 py-4 text-sm sm:grid-cols-4">
          <Field label="Received from" value={ledger.source} />
          <Field label="Amount given" value={formatINR(ledger.amount)} />
          <Field label="Date received" value={formatDate(ledger.dateReceived)} />
          <Field label="Deadline" value={ledger.deadline ? formatDate(ledger.deadline) : '—'} />
          {ledger.purpose && <Field label="Purpose" value={ledger.purpose} className="col-span-2" />}
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">Date</th>
              <th className="py-2 pr-2 font-medium">Description</th>
              <th className="py-2 pr-2 font-medium">Category</th>
              <th className="py-2 pl-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  No transactions recorded.
                </td>
              </tr>
            )}
            {txns.map((t, i) => (
              <tr key={t.id} className={`border-b border-slate-100 ${t.important ? 'bg-amber-50' : ''}`}>
                <td className="py-2 pr-2 text-slate-500">{i + 1}</td>
                <td className="whitespace-nowrap py-2 pr-2 text-slate-600">{formatDate(t.date)}</td>
                <td className="py-2 pr-2">
                  {t.important && <span className="mr-1 text-amber-500">★</span>}
                  <span className="text-slate-800">{t.description}</span>
                  {t.note && <span className="text-slate-400"> — {t.note}</span>}
                </td>
                <td className="py-2 pr-2 text-slate-600">{t.category}</td>
                <td className="whitespace-nowrap py-2 pl-2 text-right font-medium text-slate-800">
                  {formatINR(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 font-semibold">
              <td colSpan={4} className="py-2 pr-2 text-right">
                Total spent
              </td>
              <td className="py-2 pl-2 text-right">{formatINR(ledger.spent)}</td>
            </tr>
            <tr className="font-semibold">
              <td colSpan={4} className="py-1 pr-2 text-right">
                Amount given
              </td>
              <td className="py-1 pl-2 text-right">{formatINR(ledger.amount)}</td>
            </tr>
            <tr className={`text-base font-bold ${over ? 'text-red-600' : 'text-emerald-700'}`}>
              <td colSpan={4} className="py-2 pr-2 text-right">
                {over ? 'Over budget by' : 'Balance remaining'}
              </td>
              <td className="py-2 pl-2 text-right">{formatINR(Math.abs(ledger.remaining))}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-4 text-xs text-slate-500">
          {txns.length} transaction(s) · {txns.filter((t) => t.important).length} marked important
        </div>

        <div className="mt-12 flex justify-between text-sm text-slate-600">
          <div className="border-t border-slate-400 pt-1">Prepared by</div>
          <div className="border-t border-slate-400 pt-1">Received / verified by</div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, className = '' }) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  )
}
