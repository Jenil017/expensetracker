// Indian Rupee + date helpers, shared across the app.

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatINR(value) {
  const n = Number(value)
  return inr.format(Number.isFinite(n) ? n : 0)
}

// "2026-06-04" or ISO -> "4 Jun 2026"
export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value.length === 10 ? value + 'T00:00:00' : value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

// Whole days from today until the deadline (date-only). Negative = overdue.
export function daysLeft(deadline) {
  if (!deadline) return null
  const end = new Date(deadline + 'T00:00:00')
  if (Number.isNaN(end.getTime())) return null
  const today = new Date(todayISODate() + 'T00:00:00')
  return Math.round((end - today) / 86400000)
}

export const CATEGORIES = ['Food', 'Travel', 'Material', 'Shopping', 'Bills', 'Labour', 'Misc']
