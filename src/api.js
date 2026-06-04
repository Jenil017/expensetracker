// Data layer backed by Firestore. Exposes the same `api` interface the pages already use,
// so the UI code is unchanged. Summaries (spent/remaining/counts) are computed client-side.
import { db } from './firebase.js'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore'

const ledgersCol = collection(db, 'ledgers')
const txnsCol = collection(db, 'transactions')

// ---------- coercion / field whitelists ----------
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))
const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const bool = (v) => !!v

const LEDGER_FIELDS = {
  source: str,
  amount: num,
  dateReceived: str,
  purpose: str,
  expectedTxnMin: num,
  expectedTxnMax: num,
  deadline: str,
  status: str,
  note: str,
}
const TXN_FIELDS = {
  ledgerId: str,
  amount: num,
  description: str,
  category: str,
  date: str,
  important: bool,
  note: str,
}

// Keep only known fields (so update calls can be partial and can't write `id`/computed props).
function pick(input, fields) {
  const out = {}
  for (const [key, coerce] of Object.entries(fields)) {
    if (input[key] !== undefined) out[key] = coerce(input[key])
  }
  return out
}

const today = () => new Date().toISOString().slice(0, 10)
const nowISO = () => new Date().toISOString()

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
  const snap = await getDocs(ledgersCol)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
async function allTxns() {
  const snap = await getDocs(txnsCol)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const api = {
  // ----- ledgers -----
  listLedgers: async () => {
    const [ledgers, txns] = await Promise.all([allLedgers(), allTxns()])
    return ledgers
      .map((l) => summarize(l, txns))
      .sort((a, b) => ((a.createdAt || '') < (b.createdAt || '') ? 1 : -1))
  },

  getLedger: async (id) => {
    const snap = await getDoc(doc(db, 'ledgers', id))
    if (!snap.exists()) throw new Error('Ledger not found')
    const ledger = { id: snap.id, ...snap.data() }
    const txns = (await allTxns()).filter((t) => t.ledgerId === id).sort(byDateDesc)
    return { ledger: summarize(ledger, txns), transactions: txns }
  },

  createLedger: async (data) => {
    const payload = {
      status: 'active',
      purpose: '',
      note: '',
      expectedTxnMin: 0,
      expectedTxnMax: 0,
      deadline: '',
      dateReceived: today(),
      ...pick(data, LEDGER_FIELDS),
      createdAt: nowISO(),
    }
    const ref = await addDoc(ledgersCol, payload)
    return { id: ref.id, ...payload }
  },

  updateLedger: async (id, data) => {
    await updateDoc(doc(db, 'ledgers', id), pick(data, LEDGER_FIELDS))
    return { id }
  },

  deleteLedger: async (id) => {
    const txns = (await allTxns()).filter((t) => t.ledgerId === id)
    const batch = writeBatch(db)
    batch.delete(doc(db, 'ledgers', id))
    txns.forEach((t) => batch.delete(doc(db, 'transactions', t.id)))
    await batch.commit()
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

  createTransaction: async (data) => {
    const payload = {
      category: 'Misc',
      date: today(),
      important: false,
      note: '',
      ...pick(data, TXN_FIELDS),
      createdAt: nowISO(),
    }
    if (!payload.ledgerId) throw new Error('ledgerId is required')
    const ref = await addDoc(txnsCol, payload)
    return { id: ref.id, ...payload }
  },

  updateTransaction: async (id, data) => {
    await updateDoc(doc(db, 'transactions', id), pick(data, TXN_FIELDS))
    return { id }
  },

  deleteTransaction: async (id) => {
    await deleteDoc(doc(db, 'transactions', id))
  },

  // ----- backup -----
  exportData: async () => {
    const [ledgers, transactions] = await Promise.all([allLedgers(), allTxns()])
    return { ledgers, transactions }
  },

  // Replaces ALL data. Preserves ids so transaction->ledger links stay intact.
  importData: async ({ ledgers = [], transactions = [] }) => {
    const [curL, curT] = await Promise.all([allLedgers(), allTxns()])
    const batch = writeBatch(db)
    curL.forEach((l) => batch.delete(doc(db, 'ledgers', l.id)))
    curT.forEach((t) => batch.delete(doc(db, 'transactions', t.id)))
    ledgers.forEach((l) => {
      const { id, ...rest } = l
      batch.set(doc(db, 'ledgers', id || doc(ledgersCol).id), rest)
    })
    transactions.forEach((t) => {
      const { id, ...rest } = t
      batch.set(doc(db, 'transactions', id || doc(txnsCol).id), rest)
    })
    await batch.commit()
    return { ledgers: ledgers.length, transactions: transactions.length }
  },
}
