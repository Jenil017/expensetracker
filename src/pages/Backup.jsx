import { useRef, useState } from 'react'
import { api } from '../api.js'
import { todayISODate } from '../utils/format.js'

export default function Backup() {
  const fileRef = useRef(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onExport = async () => {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const data = await api.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hisab-backup-${todayISODate()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMessage(`Exported ${data.ledgers.length} ledger(s) and ${data.transactions.length} transaction(s).`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setMessage('')
    if (!confirm('Importing will REPLACE all current data with the contents of this file. Continue?')) {
      e.target.value = ''
      return
    }
    setBusy(true)
    try {
      const json = JSON.parse(await file.text())
      if (!Array.isArray(json.ledgers) || !Array.isArray(json.transactions)) {
        throw new Error('Invalid backup file: expected { ledgers: [], transactions: [] }')
      }
      const res = await api.importData(json)
      setMessage(`Imported ${res.ledgers} ledger(s) and ${res.transactions} transaction(s).`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Backup &amp; Restore</h1>
        <p className="text-sm text-slate-500">
          Your data is stored safely in Firebase. You can still export a JSON copy anytime, or restore from one.
        </p>
      </div>

      <div className="card space-y-2 p-5">
        <h2 className="font-semibold text-slate-800">Export</h2>
        <p className="text-sm text-slate-500">Download a complete copy of all ledgers and transactions as JSON.</p>
        <button onClick={onExport} disabled={busy} className="btn-primary mt-1 w-fit">
          Download backup (.json)
        </button>
      </div>

      <div className="card space-y-2 p-5">
        <h2 className="font-semibold text-slate-800">Import / Restore</h2>
        <p className="text-sm text-slate-500">
          Restore from a previously exported file. <span className="font-medium text-red-600">This replaces all current data.</span>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onImport}
          disabled={busy}
          className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        />
        {busy && <p className="text-sm text-slate-500">Working…</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
