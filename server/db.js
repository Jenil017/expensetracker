// Data layer backed by Neon Postgres (node-postgres). Exposes the same `api`-style
// interface the old data layer did, so the REST routes stay thin. All amounts/dates
// are returned in the exact shapes the React UI already expects.
import './env.js'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Put your Neon connection string in .env.local (dev) or Render env vars (prod).')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires TLS; this avoids local CA hassles.
  ssl: { rejectUnauthorized: false },
})

// ---------- schema ----------
export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ledgers (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT '',
      amount NUMERIC NOT NULL DEFAULT 0,
      date_received TEXT NOT NULL DEFAULT '',
      purpose TEXT NOT NULL DEFAULT '',
      expected_txn_min INTEGER NOT NULL DEFAULT 0,
      expected_txn_max INTEGER NOT NULL DEFAULT 0,
      deadline TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      ledger_id TEXT NOT NULL,
      amount NUMERIC NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Misc',
      date TEXT NOT NULL DEFAULT '',
      important BOOLEAN NOT NULL DEFAULT false,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_txn_ledger ON transactions(ledger_id);
  `)
}

// ---------- coercion / row mapping ----------
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))
const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const bool = (v) => !!v
const today = () => new Date().toISOString().slice(0, 10)
const nowISO = () => new Date().toISOString()

const ledgerRow = (r) => ({
  id: r.id,
  source: r.source,
  amount: num(r.amount),
  dateReceived: r.date_received,
  purpose: r.purpose,
  expectedTxnMin: num(r.expected_txn_min),
  expectedTxnMax: num(r.expected_txn_max),
  deadline: r.deadline,
  status: r.status,
  note: r.note,
  createdAt: r.created_at,
})
const txnRow = (r) => ({
  id: r.id,
  ledgerId: r.ledger_id,
  amount: num(r.amount),
  description: r.description,
  category: r.category,
  date: r.date,
  important: bool(r.important),
  note: r.note,
  createdAt: r.created_at,
})

// ---------- shared compute (matches the previous client-side logic) ----------
const byDateDesc = (a, b) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : (a.createdAt || '') < (b.createdAt || '') ? 1 : -1

function summarize(ledger, transactions) {
  const mine = transactions.filter((t) => t.ledgerId === ledger.id)
  const spent = mine.reduce((s, t) => s + num(t.amount), 0)
  return {
    ...ledger,
    spent,
    remaining: num(ledger.amount) - spent,
    txnCount: mine.length,
    importantCount: mine.filter((t) => t.important).length,
  }
}

async function allLedgers() {
  const { rows } = await pool.query('SELECT * FROM ledgers')
  return rows.map(ledgerRow)
}
async function allTxns() {
  const { rows } = await pool.query('SELECT * FROM transactions')
  return rows.map(txnRow)
}

// ---------- API ----------
export const data = {
  // ----- ledgers -----
  listLedgers: async () => {
    const [ledgers, txns] = await Promise.all([allLedgers(), allTxns()])
    return ledgers
      .map((l) => summarize(l, txns))
      .sort((a, b) => ((a.createdAt || '') < (b.createdAt || '') ? 1 : -1))
  },

  getLedger: async (id) => {
    const { rows } = await pool.query('SELECT * FROM ledgers WHERE id = $1', [id])
    if (!rows.length) {
      const err = new Error('Ledger not found')
      err.status = 404
      throw err
    }
    const ledger = ledgerRow(rows[0])
    const txns = (await allTxns()).filter((t) => t.ledgerId === id).sort(byDateDesc)
    return { ledger: summarize(ledger, txns), transactions: txns }
  },

  createLedger: async (input = {}) => {
    const id = randomUUID()
    const row = {
      id,
      source: str(input.source),
      amount: num(input.amount),
      date_received: input.dateReceived ? str(input.dateReceived) : today(),
      purpose: str(input.purpose),
      expected_txn_min: num(input.expectedTxnMin),
      expected_txn_max: num(input.expectedTxnMax),
      deadline: str(input.deadline),
      status: input.status ? str(input.status) : 'active',
      note: str(input.note),
      created_at: nowISO(),
    }
    await pool.query(
      `INSERT INTO ledgers (id, source, amount, date_received, purpose, expected_txn_min,
         expected_txn_max, deadline, status, note, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [row.id, row.source, row.amount, row.date_received, row.purpose, row.expected_txn_min,
        row.expected_txn_max, row.deadline, row.status, row.note, row.created_at],
    )
    return ledgerRow(row)
  },

  updateLedger: async (id, input = {}) => {
    const map = {
      source: ['source', str],
      amount: ['amount', num],
      dateReceived: ['date_received', str],
      purpose: ['purpose', str],
      expectedTxnMin: ['expected_txn_min', num],
      expectedTxnMax: ['expected_txn_max', num],
      deadline: ['deadline', str],
      status: ['status', str],
      note: ['note', str],
    }
    const sets = []
    const vals = []
    for (const [key, [col, coerce]] of Object.entries(map)) {
      if (input[key] !== undefined) {
        vals.push(coerce(input[key]))
        sets.push(`${col} = $${vals.length}`)
      }
    }
    if (sets.length) {
      vals.push(id)
      await pool.query(`UPDATE ledgers SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals)
    }
    return { id }
  },

  deleteLedger: async (id) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM transactions WHERE ledger_id = $1', [id])
      await client.query('DELETE FROM ledgers WHERE id = $1', [id])
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  },

  // ----- transactions -----
  listTransactions: async (params = {}) => {
    let list = await allTxns()
    const { ledgerId, important, q, from, to, category } = params
    if (ledgerId) list = list.filter((t) => t.ledgerId === ledgerId)
    if (important === 'true' || important === true) list = list.filter((t) => t.important)
    if (category) list = list.filter((t) => t.category === category)
    if (from) list = list.filter((t) => t.date >= from)
    if (to) list = list.filter((t) => t.date <= to)
    if (q) {
      const needle = String(q).toLowerCase()
      list = list.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(needle) ||
          (t.category || '').toLowerCase().includes(needle) ||
          (t.note || '').toLowerCase().includes(needle),
      )
    }
    return list.sort(byDateDesc)
  },

  createTransaction: async (input = {}) => {
    if (!input.ledgerId) {
      const err = new Error('ledgerId is required')
      err.status = 400
      throw err
    }
    const id = randomUUID()
    const row = {
      id,
      ledger_id: str(input.ledgerId),
      amount: num(input.amount),
      description: str(input.description),
      category: input.category ? str(input.category) : 'Misc',
      date: input.date ? str(input.date) : today(),
      important: bool(input.important),
      note: str(input.note),
      created_at: nowISO(),
    }
    await pool.query(
      `INSERT INTO transactions (id, ledger_id, amount, description, category, date, important, note, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [row.id, row.ledger_id, row.amount, row.description, row.category, row.date, row.important, row.note, row.created_at],
    )
    return txnRow(row)
  },

  updateTransaction: async (id, input = {}) => {
    const map = {
      ledgerId: ['ledger_id', str],
      amount: ['amount', num],
      description: ['description', str],
      category: ['category', str],
      date: ['date', str],
      important: ['important', bool],
      note: ['note', str],
    }
    const sets = []
    const vals = []
    for (const [key, [col, coerce]] of Object.entries(map)) {
      if (input[key] !== undefined) {
        vals.push(coerce(input[key]))
        sets.push(`${col} = $${vals.length}`)
      }
    }
    if (sets.length) {
      vals.push(id)
      await pool.query(`UPDATE transactions SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals)
    }
    return { id }
  },

  deleteTransaction: async (id) => {
    await pool.query('DELETE FROM transactions WHERE id = $1', [id])
  },

  // ----- backup -----
  exportData: async () => {
    const [ledgers, transactions] = await Promise.all([allLedgers(), allTxns()])
    return { ledgers, transactions }
  },

  // Replaces ALL data. Preserves ids so transaction->ledger links stay intact.
  importData: async ({ ledgers = [], transactions = [] }) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM transactions')
      await client.query('DELETE FROM ledgers')
      for (const l of ledgers) {
        await client.query(
          `INSERT INTO ledgers (id, source, amount, date_received, purpose, expected_txn_min,
             expected_txn_max, deadline, status, note, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            l.id || randomUUID(), str(l.source), num(l.amount), str(l.dateReceived), str(l.purpose),
            num(l.expectedTxnMin), num(l.expectedTxnMax), str(l.deadline),
            l.status ? str(l.status) : 'active', str(l.note), l.createdAt || nowISO(),
          ],
        )
      }
      for (const t of transactions) {
        await client.query(
          `INSERT INTO transactions (id, ledger_id, amount, description, category, date, important, note, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            t.id || randomUUID(), str(t.ledgerId), num(t.amount), str(t.description),
            t.category ? str(t.category) : 'Misc', str(t.date), bool(t.important),
            str(t.note), t.createdAt || nowISO(),
          ],
        )
      }
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
    return { ledgers: ledgers.length, transactions: transactions.length }
  },
}
