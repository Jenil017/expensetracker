import './env.js'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { db, initSchema } from './db.js'
import { signToken, authMiddleware, revokeToken, verifyGoogleToken, hashPassword, comparePassword } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')
const PORT = process.env.PORT || 3000

const app = express()

// Security headers on every response
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://accounts.google.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "frame-src https://accounts.google.com; " +
    "connect-src 'self' https://accounts.google.com"
  )
  next()
})

app.use(express.json({ limit: '5mb' }))

app.get('/healthz', (_req, res) => res.type('text').send('ok'))

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /api/\n')
})

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next)

// ---- validation helpers ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email) {
  const e = String(email).trim().toLowerCase()
  if (!EMAIL_RE.test(e)) throw Object.assign(new Error('Invalid email format'), { status: 400 })
  return e
}

function validateAmount(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) throw Object.assign(new Error('amount must be a number'), { status: 400 })
  if (n <= 0) throw Object.assign(new Error('amount must be greater than 0'), { status: 400 })
  if (n > 9999999999.99) throw Object.assign(new Error('amount too large'), { status: 400 })
  return n
}

// ---- auth (public) ----
app.post('/api/auth/google', h(async (req, res) => {
  const { credential } = req.body || {}
  if (!credential) return res.status(400).json({ error: 'credential required' })
  const payload = await verifyGoogleToken(credential)
  const email = normalizeEmail(payload.email)
  let user = await db.findUserByEmail(email)
  if (!user) {
    user = await db.createUser({
      email,
      name: payload.name || '',
      avatarUrl: payload.picture || '',
      provider: 'google',
    })
  }
  const token = signToken(user.id)
  res.json({ token, user })
}))

app.post('/api/auth/register', h(async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' })

  const trimmedName = String(name).trim()
  if (!trimmedName) return res.status(400).json({ error: 'name cannot be blank' })
  if (trimmedName.length > 100) return res.status(400).json({ error: 'name too long (max 100 chars)' })

  const normalizedEmail = normalizeEmail(String(email))

  const pw = String(password)
  if (!pw.trim()) return res.status(400).json({ error: 'password cannot be blank or whitespace' })
  if (pw.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

  const existing = await db.findUserByEmail(normalizedEmail)
  if (existing) return res.status(409).json({ error: 'Email already registered' })

  const passwordHash = await hashPassword(pw)
  const user = await db.createUser({ name: trimmedName, email: normalizedEmail, passwordHash, provider: 'email' })
  const token = signToken(user.id)
  res.status(201).json({ token, user })
}))

app.post('/api/auth/login', h(async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  const normalizedEmail = normalizeEmail(String(email))
  const user = await db.findUserByEmail(normalizedEmail)
  if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid email or password' })
  const ok = await comparePassword(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' })
  const token = signToken(user.id)
  const { passwordHash: _, ...safeUser } = user
  res.json({ token, user: safeUser })
}))

// ---- protected routes ----
app.use('/api', authMiddleware)

app.post('/api/auth/logout', h(async (req, res) => {
  revokeToken(req.token)
  res.status(204).end()
}))

app.get('/api/auth/me', h(async (req, res) => {
  const user = await db.findUserById(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ user })
}))

app.put('/api/auth/me', h(async (req, res) => {
  const user = await db.updateUser(req.userId, req.body)
  res.json({ user })
}))

// ---- persons ----
app.get('/api/persons', h(async (req, res) => res.json(await db.listPersons(req.userId))))

app.post('/api/persons', h(async (req, res) => {
  const { name, phone, note } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name required' })
  const trimmedName = String(name).trim()
  if (!trimmedName) return res.status(400).json({ error: 'name cannot be blank' })
  if (trimmedName.length > 200) return res.status(400).json({ error: 'name too long (max 200 chars)' })
  res.status(201).json(await db.createPerson(req.userId, { name: trimmedName, phone, note }))
}))

app.put('/api/persons/:id', h(async (req, res) => {
  const person = await db.updatePerson(req.params.id, req.userId, req.body)
  if (!person) return res.status(404).json({ error: 'Not found' })
  res.json(person)
}))

app.delete('/api/persons/:id', h(async (req, res) => {
  const deleted = await db.deletePerson(req.params.id, req.userId)
  if (!deleted) return res.status(404).json({ error: 'Not found' })
  res.status(204).end()
}))

// ---- person transactions ----
app.get('/api/persons/:id/transactions', h(async (req, res) => {
  res.json(await db.listPersonTransactions(req.params.id, req.userId, req.query))
}))

app.post('/api/transactions', h(async (req, res) => {
  const { amount, ...rest } = req.body || {}
  const validAmount = validateAmount(amount)
  res.status(201).json(await db.createTransaction(req.userId, { amount: validAmount, ...rest }))
}))

app.put('/api/transactions/:id', h(async (req, res) => {
  const body = { ...req.body }
  if (body.amount !== undefined) body.amount = validateAmount(body.amount)
  const txn = await db.updateTransaction(req.params.id, req.userId, body)
  if (!txn) return res.status(404).json({ error: 'Not found' })
  res.json(txn)
}))

app.delete('/api/transactions/:id', h(async (req, res) => {
  const deleted = await db.deleteTransaction(req.params.id, req.userId)
  if (!deleted) return res.status(404).json({ error: 'Not found' })
  res.status(204).end()
}))

// ---- expenses ----
app.get('/api/expenses', h(async (req, res) => res.json(await db.listExpenses(req.userId, req.query))))

app.post('/api/expenses', h(async (req, res) => {
  const { amount, ...rest } = req.body || {}
  const validAmount = validateAmount(amount)
  res.status(201).json(await db.createExpense(req.userId, { amount: validAmount, ...rest }))
}))

app.put('/api/expenses/:id', h(async (req, res) => {
  const body = { ...req.body }
  if (body.amount !== undefined) body.amount = validateAmount(body.amount)
  const expense = await db.updateExpense(req.params.id, req.userId, body)
  if (!expense) return res.status(404).json({ error: 'Not found' })
  res.json(expense)
}))

app.delete('/api/expenses/:id', h(async (req, res) => {
  const deleted = await db.deleteExpense(req.params.id, req.userId)
  if (!deleted) return res.status(404).json({ error: 'Not found' })
  res.status(204).end()
}))

// ---- global search ----
app.get('/api/search', h(async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (!q) return res.json({ persons: [], transactions: [] })
  res.json(await db.searchAll(req.userId, q))
}))

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

app.use(express.static(distDir))
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))

app.use((err, _req, res, _next) => {
  // Don't leak raw JSON parser errors
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ error: 'Invalid JSON in request body' })
  }
  console.error(err)
  const status = err.status || 500
  // Never expose internal DB/server messages to clients
  const message = status < 500 ? (err.message || 'Bad request') : 'Server error'
  res.status(status).json({ error: message })
})

initSchema()
  .then(() => app.listen(PORT, () => console.log(`Transaction Buddy server on :${PORT}`)))
  .catch((e) => { console.error('Schema init failed:', e); process.exit(1) })
