// Hisab server: serves the built React app and a /api/* REST layer from one origin.
// Data lives in Neon Postgres (see db.js). Access is gated by a single shared password
// (APP_PASSWORD), sent by the client as a Bearer token.
// Load env vars before anything else imports db.js (which reads DATABASE_URL).
import './env.js'

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { data, initSchema } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')
const PORT = process.env.PORT || 3000
const APP_PASSWORD = process.env.APP_PASSWORD || ''

const app = express()
app.use(express.json({ limit: '5mb' })) // import payloads can be largish

// Health check for the keep-alive pinger (no auth).
app.get('/healthz', (_req, res) => res.type('text').send('ok'))

// ---------- auth ----------
function checkPassword(pw) {
  return !!APP_PASSWORD && pw === APP_PASSWORD
}
// Validate a password without doing anything else (used on the login screen).
app.post('/api/login', (req, res) => {
  if (!APP_PASSWORD) return res.status(500).json({ error: 'Server has no APP_PASSWORD set.' })
  if (checkPassword(req.body?.password)) return res.json({ ok: true })
  return res.status(401).json({ error: 'Wrong password.' })
})

// Gate everything else under /api with the Bearer token.
app.use('/api', (req, res, next) => {
  const auth = req.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (checkPassword(token)) return next()
  return res.status(401).json({ error: 'Unauthorized' })
})

// small async wrapper so thrown errors hit the error handler
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next)

// ----- ledgers -----
app.get('/api/ledgers', h(async (_req, res) => res.json(await data.listLedgers())))
app.get('/api/ledgers/:id', h(async (req, res) => res.json(await data.getLedger(req.params.id))))
app.post('/api/ledgers', h(async (req, res) => res.status(201).json(await data.createLedger(req.body))))
app.put('/api/ledgers/:id', h(async (req, res) => res.json(await data.updateLedger(req.params.id, req.body))))
app.delete('/api/ledgers/:id', h(async (req, res) => { await data.deleteLedger(req.params.id); res.status(204).end() }))

// ----- transactions -----
app.get('/api/transactions', h(async (req, res) => res.json(await data.listTransactions(req.query))))
app.post('/api/transactions', h(async (req, res) => res.status(201).json(await data.createTransaction(req.body))))
app.put('/api/transactions/:id', h(async (req, res) => res.json(await data.updateTransaction(req.params.id, req.body))))
app.delete('/api/transactions/:id', h(async (req, res) => { await data.deleteTransaction(req.params.id); res.status(204).end() }))

// ----- backup -----
app.get('/api/export', h(async (_req, res) => res.json(await data.exportData())))
app.post('/api/import', h(async (req, res) => res.json(await data.importData(req.body || {}))))

// Unknown API route -> JSON 404 (don't fall through to the SPA).
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

// ---------- static frontend + SPA fallback ----------
app.use(express.static(distDir))
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))

// ---------- error handler ----------
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Hisab server listening on :${PORT}`))
  })
  .catch((e) => {
    console.error('Failed to initialize database schema:', e)
    process.exit(1)
  })
