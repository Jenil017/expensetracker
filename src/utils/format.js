export function formatINR(amount) {
  const n = Number(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(n))
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d)) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = d.toLocaleString('en-IN', { month: 'short' })
  const yyyy = d.getFullYear()
  return `${dd} ${mm} ${yyyy}`
}

export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d)) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = d.toLocaleString('en-IN', { month: 'short' })
  return `${dd} ${mm}`
}

export function formatDateTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d)) return isoStr
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d)) return ''
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function relativeDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0)
  const diff = Math.round((todayD - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' })
  return formatDate(dateStr)
}

export function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const AVATAR_COLORS = [
  ['#2C5EAD', '#C4E2F5'],
  ['#1591DC', '#EEF5FD'],
  ['#16A34A', '#DCFCE7'],
  ['#9333EA', '#F3E8FF'],
  ['#D97706', '#FEF3C7'],
  ['#DB2777', '#FCE7F3'],
  ['#0891B2', '#CFFAFE'],
  ['#DC2626', '#FEE2E2'],
]

export function avatarColor(name = '') {
  const code = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

export const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Transport', 'Shopping', 'Entertainment',
  'Bills & Utilities', 'Health', 'Travel', 'Education', 'Other',
]

export const CATEGORY_COLORS = {
  'Food & Dining': '#2C5EAD',
  'Transport':     '#1591DC',
  'Shopping':      '#9333EA',
  'Entertainment': '#D97706',
  'Bills & Utilities': '#0891B2',
  'Health':        '#DC2626',
  'Travel':        '#16A34A',
  'Education':     '#DB2777',
  'Other':         '#6B7280',
}
