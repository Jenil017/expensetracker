import './env.js'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set.')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT 'email',
      password_hash TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS persons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_persons_user ON persons(user_id);

    CREATE TABLE IF NOT EXISTS person_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
      amount NUMERIC(12,2) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ptxns_person ON person_transactions(person_id);
    CREATE INDEX IF NOT EXISTS idx_ptxns_user ON person_transactions(user_id);

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      description TEXT NOT NULL DEFAULT '',
      exp_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
  `)
}

const str = (v) => (v == null ? '' : String(v).trim())
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const nowISO = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)

const userRow = (r) => ({
  id: r.id,
  email: r.email,
  name: r.name,
  avatarUrl: r.avatar_url,
  provider: r.provider,
  createdAt: r.created_at,
})

const personRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  phone: r.phone,
  note: r.note,
  createdAt: r.created_at,
})

const txnRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  personId: r.person_id,
  type: r.type,
  amount: num(r.amount),
  description: r.description,
  date: r.txn_date instanceof Date ? r.txn_date.toISOString().slice(0, 10) : String(r.txn_date).slice(0, 10),
  createdAt: r.created_at,
})

const expenseRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  amount: num(r.amount),
  category: r.category,
  description: r.description,
  date: r.exp_date instanceof Date ? r.exp_date.toISOString().slice(0, 10) : String(r.exp_date).slice(0, 10),
  createdAt: r.created_at,
})

export const db = {
  // ---- users ----
  findUserByEmail: async (email) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    return rows[0] ? { ...userRow(rows[0]), passwordHash: rows[0].password_hash } : null
  },

  findUserById: async (id) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id])
    return rows[0] ? userRow(rows[0]) : null
  },

  createUser: async ({ email, name, avatarUrl = '', provider = 'email', passwordHash = '' }) => {
    const id = randomUUID()
    const { rows } = await pool.query(
      `INSERT INTO users (id, email, name, avatar_url, provider, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, str(email), str(name), str(avatarUrl), str(provider), str(passwordHash)],
    )
    return userRow(rows[0])
  },

  updateUser: async (id, { name, avatarUrl }) => {
    const sets = []
    const vals = []
    if (name !== undefined) { vals.push(str(name)); sets.push(`name = $${vals.length}`) }
    if (avatarUrl !== undefined) { vals.push(str(avatarUrl)); sets.push(`avatar_url = $${vals.length}`) }
    if (!sets.length) return db.findUserById(id)
    vals.push(id)
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals)
    return db.findUserById(id)
  },

  // ---- persons ----
  listPersons: async (userId) => {
    const { rows: persons } = await pool.query(
      'SELECT * FROM persons WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    )
    const { rows: txns } = await pool.query(
      'SELECT person_id, type, amount FROM person_transactions WHERE user_id = $1',
      [userId],
    )
    return persons.map((p) => {
      const mine = txns.filter((t) => t.person_id === p.id)
      const credits = mine.filter((t) => t.type === 'credit').reduce((s, t) => s + num(t.amount), 0)
      const debits = mine.filter((t) => t.type === 'debit').reduce((s, t) => s + num(t.amount), 0)
      return { ...personRow(p), balance: credits - debits, credits, debits, txnCount: mine.length }
    })
  },

  getPerson: async (id, userId) => {
    const { rows } = await pool.query(
      'SELECT * FROM persons WHERE id = $1 AND user_id = $2',
      [id, userId],
    )
    return rows[0] ? personRow(rows[0]) : null
  },

  createPerson: async (userId, { name, phone = '', note = '' }) => {
    const id = randomUUID()
    const { rows } = await pool.query(
      `INSERT INTO persons (id, user_id, name, phone, note) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, userId, str(name), str(phone), str(note)],
    )
    return personRow(rows[0])
  },

  updatePerson: async (id, userId, { name, phone, note }) => {
    const sets = []
    const vals = []
    if (name !== undefined) { vals.push(str(name)); sets.push(`name = $${vals.length}`) }
    if (phone !== undefined) { vals.push(str(phone)); sets.push(`phone = $${vals.length}`) }
    if (note !== undefined) { vals.push(str(note)); sets.push(`note = $${vals.length}`) }
    if (!sets.length) return db.getPerson(id, userId)
    vals.push(id, userId)
    await pool.query(
      `UPDATE persons SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND user_id = $${vals.length}`,
      vals,
    )
    return db.getPerson(id, userId)
  },

  deletePerson: async (id, userId) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM person_transactions WHERE person_id = $1 AND user_id = $2', [id, userId])
      await client.query('DELETE FROM persons WHERE id = $1 AND user_id = $2', [id, userId])
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  },

  // ---- person transactions ----
  listPersonTransactions: async (personId, userId, { from, to } = {}) => {
    let q = 'SELECT * FROM person_transactions WHERE person_id = $1 AND user_id = $2'
    const vals = [personId, userId]
    if (from) { vals.push(from); q += ` AND txn_date >= $${vals.length}` }
    if (to) { vals.push(to); q += ` AND txn_date <= $${vals.length}` }
    q += ' ORDER BY txn_date DESC, created_at DESC'
    const { rows } = await pool.query(q, vals)
    return rows.map(txnRow)
  },

  createTransaction: async (userId, { personId, type, amount, description = '', date }) => {
    if (!personId) throw Object.assign(new Error('personId required'), { status: 400 })
    if (!['credit', 'debit'].includes(type)) throw Object.assign(new Error('type must be credit or debit'), { status: 400 })
    const id = randomUUID()
    const { rows } = await pool.query(
      `INSERT INTO person_transactions (id, user_id, person_id, type, amount, description, txn_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, userId, str(personId), type, num(amount), str(description), date || today()],
    )
    return txnRow(rows[0])
  },

  updateTransaction: async (id, userId, { type, amount, description, date }) => {
    const sets = []
    const vals = []
    if (type !== undefined) { vals.push(type); sets.push(`type = $${vals.length}`) }
    if (amount !== undefined) { vals.push(num(amount)); sets.push(`amount = $${vals.length}`) }
    if (description !== undefined) { vals.push(str(description)); sets.push(`description = $${vals.length}`) }
    if (date !== undefined) { vals.push(date); sets.push(`txn_date = $${vals.length}`) }
    if (!sets.length) return { id }
    vals.push(id, userId)
    await pool.query(
      `UPDATE person_transactions SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND user_id = $${vals.length}`,
      vals,
    )
    return { id }
  },

  deleteTransaction: async (id, userId) => {
    await pool.query('DELETE FROM person_transactions WHERE id = $1 AND user_id = $2', [id, userId])
  },

  // ---- expenses ----
  listExpenses: async (userId, { from, to, category } = {}) => {
    let q = 'SELECT * FROM expenses WHERE user_id = $1'
    const vals = [userId]
    if (from) { vals.push(from); q += ` AND exp_date >= $${vals.length}` }
    if (to) { vals.push(to); q += ` AND exp_date <= $${vals.length}` }
    if (category) { vals.push(category); q += ` AND category = $${vals.length}` }
    q += ' ORDER BY exp_date DESC, created_at DESC'
    const { rows } = await pool.query(q, vals)
    return rows.map(expenseRow)
  },

  createExpense: async (userId, { amount, category = 'Other', description = '', date }) => {
    const id = randomUUID()
    const { rows } = await pool.query(
      `INSERT INTO expenses (id, user_id, amount, category, description, exp_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, userId, num(amount), str(category), str(description), date || today()],
    )
    return expenseRow(rows[0])
  },

  updateExpense: async (id, userId, { amount, category, description, date }) => {
    const sets = []
    const vals = []
    if (amount !== undefined) { vals.push(num(amount)); sets.push(`amount = $${vals.length}`) }
    if (category !== undefined) { vals.push(str(category)); sets.push(`category = $${vals.length}`) }
    if (description !== undefined) { vals.push(str(description)); sets.push(`description = $${vals.length}`) }
    if (date !== undefined) { vals.push(date); sets.push(`exp_date = $${vals.length}`) }
    if (!sets.length) return { id }
    vals.push(id, userId)
    await pool.query(
      `UPDATE expenses SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND user_id = $${vals.length}`,
      vals,
    )
    return { id }
  },

  deleteExpense: async (id, userId) => {
    await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId])
  },

  // ---- global search ----
  searchAll: async (userId, q) => {
    const needle = `%${q.trim()}%`
    const [{ rows: txnRows }, { rows: personRows }] = await Promise.all([
      pool.query(`
        SELECT pt.*, p.name AS person_name
        FROM person_transactions pt
        JOIN persons p ON p.id = pt.person_id
        WHERE pt.user_id = $1
          AND (
            pt.description ILIKE $2
            OR p.name ILIKE $2
            OR CAST(pt.amount AS TEXT) ILIKE $2
          )
        ORDER BY pt.txn_date DESC, pt.created_at DESC
        LIMIT 100
      `, [userId, needle]),
      pool.query(`
        SELECT p.*,
          COALESCE(SUM(CASE WHEN pt.type='credit' THEN pt.amount ELSE 0 END),0)
          - COALESCE(SUM(CASE WHEN pt.type='debit'  THEN pt.amount ELSE 0 END),0) AS balance,
          COUNT(pt.id) AS txn_count
        FROM persons p
        LEFT JOIN person_transactions pt ON pt.person_id = p.id AND pt.user_id = $1
        WHERE p.user_id = $1 AND p.name ILIKE $2
        GROUP BY p.id ORDER BY p.name
      `, [userId, needle]),
    ])
    return {
      persons: personRows.map(r => ({
        ...personRow(r),
        balance: num(r.balance),
        txnCount: Number(r.txn_count) || 0,
      })),
      transactions: txnRows.map(r => ({
        ...txnRow(r),
        personName: r.person_name,
      })),
    }
  },
}
