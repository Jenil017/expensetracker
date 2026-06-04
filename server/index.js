import './env.js'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { db, initSchema } from './db.js'
import { signToken, authMiddleware, verifyGoogleToken, hashPassword, comparePassword } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')
const PORT = process.env.PORT || 3000

const app = express()
app.use(express.json({ limit: '5mb' }))

app.get('/healthz', (_req, res) => res.type('text').send('ok'))

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next)

// ---- auth (public) ----
app.post('/api/auth/google', h(async (req, res) => {
  const { credential } = req.body || {}
  if (!credential) return res.status(400).json({ error: 'credential required' })
  const payload = await verifyGoogleToken(credential)
  let user = await db.findUserByEmail(payload.email)
  if (!user) {
    user = await db.createUser({
      email: payload.email,
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
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  const existing = await db.findUserByEmail(email)
  if (existing) return res.status(409).json({ error: 'Email already registered' })
  const passwordHash = await hashPassword(password)
  const user = await db.createUser({ name, email, passwordHash, provider: 'email' })
  const token = signToken(user.id)
  res.status(201).json({ token, user })
}))

app.post('/api/auth/login', h(async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  const user = await db.findUserByEmail(email)
  if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid email or password' })
  const ok = await comparePassword(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' })
  const token = signToken(user.id)
  const { passwordHash: _, ...safeUser } = user
  res.json({ token, user: safeUser })
}))

// ---- protected routes ----
app.use('/api', authMiddleware)

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
app.post('/api/persons', h(async (req, res) => res.status(201).json(await db.createPerson(req.userId, req.body))))
app.put('/api/persons/:id', h(async (req, res) => res.json(await db.updatePerson(req.params.id, req.userId, req.body))))
app.delete('/api/persons/:id', h(async (req, res) => { await db.deletePerson(req.params.id, req.userId); res.status(204).end() }))

// ---- person transactions ----
app.get('/api/persons/:id/transactions', h(async (req, res) => {
  res.json(await db.listPersonTransactions(req.params.id, req.userId, req.query))
}))
app.post('/api/transactions', h(async (req, res) => res.status(201).json(await db.createTransaction(req.userId, req.body))))
app.put('/api/transactions/:id', h(async (req, res) => res.json(await db.updateTransaction(req.params.id, req.userId, req.body))))
app.delete('/api/transactions/:id', h(async (req, res) => { await db.deleteTransaction(req.params.id, req.userId); res.status(204).end() }))

// ---- expenses ----
app.get('/api/expenses', h(async (req, res) => res.json(await db.listExpenses(req.userId, req.query))))
app.post('/api/expenses', h(async (req, res) => res.status(201).json(await db.createExpense(req.userId, req.body))))
app.put('/api/expenses/:id', h(async (req, res) => res.json(await db.updateExpense(req.params.id, req.userId, req.body))))
app.delete('/api/expenses/:id', h(async (req, res) => { await db.deleteExpense(req.params.id, req.userId); res.status(204).end() }))

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

app.use(express.static(distDir))
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

initSchema()
  .then(() => app.listen(PORT, () => console.log(`Transaction Buddy server on :${PORT}`)))
  .catch((e) => { console.error('Schema init failed:', e); process.exit(1) })
