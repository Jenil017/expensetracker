import { useState, useEffect } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import AddExpenseModal from '../components/AddExpenseModal.jsx'
import { formatINR, formatDate, daysAgo, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '../utils/format.js'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

const COLORS = ['#2C5EAD', '#1591DC', '#4BB8FA', '#16A34A', '#D97706', '#9333EA', '#DB2777', '#0891B2', '#DC2626']

const PERIODS = [
  { label: '7D',   days: 7 },
  { label: '30D',  days: 30 },
  { label: '90D',  days: 90 },
  { label: 'All',  days: null },
]

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="skeleton h-5 w-32 rounded mb-4" />
        <div className="skeleton h-40 w-full rounded-xl" />
      </div>
      <div className="card p-5">
        <div className="skeleton h-5 w-28 rounded mb-4" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-card-lg border border-brand-100 px-3 py-2">
      <p className="text-xs font-semibold text-brand-700">{payload[0].name}</p>
      <p className="text-sm font-bold text-brand-500 tabular">{formatINR(payload[0].value)}</p>
    </div>
  )
}

export default function Analytics() {
  const toast = useToast()
  const [expenses, setExpenses] = useState(null)
  const [persons, setPersons] = useState(null)
  const [period, setPeriod] = useState(30)
  const [showAdd, setShowAdd] = useState(false)
  const [editExpense, setEditExpense] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const load = () => {
    const from = period ? daysAgo(period) : undefined
    Promise.all([
      api.listExpenses({ from }),
      api.listPersons(),
    ])
      .then(([exp, pers]) => { setExpenses(exp); setPersons(pers) })
      .catch(e => toast.error(e.message))
  }

  useEffect(() => {
    setExpenses(null)
    load()
  }, [period])

  const total = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0

  const byCategory = expenses?.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
    return acc
  }, {}) || {}

  const categoryData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Daily bar chart data (last 30 days or selected period)
  const days = period || 90
  const barData = []
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i)
    const amt = expenses?.filter(e => e.date === date).reduce((s, e) => s + Number(e.amount), 0) || 0
    barData.push({ date: date.slice(5), amt })
  }
  const barDataTrimmed = barData.filter((_, i, arr) => {
    if (arr.length <= 14) return true
    return i % Math.ceil(arr.length / 14) === 0 || i === arr.length - 1
  })

  const personBalance = {
    toGet: persons?.filter(p => p.balance > 0).reduce((s, p) => s + p.balance, 0) || 0,
    toGive: persons?.filter(p => p.balance < 0).reduce((s, p) => s + Math.abs(p.balance), 0) || 0,
    pendingCount: persons?.filter(p => p.balance !== 0).length || 0,
  }

  const handleDelete = async () => {
    try {
      await api.deleteExpense(deleteId)
      toast.success('Expense deleted')
      setDeleteId(null)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="bg-brand-gradient safe-top">
        <div className="page-inner pt-4 pb-5">
          <div className="flex items-center justify-between">
            <h1 className="text-white font-extrabold text-xl">Analytics</h1>
            <button
              onClick={() => setShowAdd(true)}
              className="h-10 px-3 rounded-xl bg-white/20 flex items-center gap-1.5 text-white text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Expense
            </button>
          </div>

          {/* Period selector */}
          <div className="flex gap-1.5 mt-3">
            {PERIODS.map(p => (
              <button
                key={p.label}
                onClick={() => setPeriod(p.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === p.days
                    ? 'bg-white text-brand-500'
                    : 'bg-white/15 text-white/80 hover:bg-white/25'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-inner pt-4 space-y-4">
        {/* Khata balance summary */}
        {persons && (
          <div className="card p-4 animate-fade-up">
            <h2 className="text-sm font-bold text-brand-600 mb-3">Khata Summary</h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-credit-50 p-3 text-center">
                <p className="text-[10px] font-bold text-credit-600 mb-1">To Collect</p>
                <p className="font-bold text-credit-700 tabular text-sm">{formatINR(personBalance.toGet)}</p>
              </div>
              <div className="rounded-xl bg-debit-50 p-3 text-center">
                <p className="text-[10px] font-bold text-debit-600 mb-1">To Pay</p>
                <p className="font-bold text-debit-700 tabular text-sm">{formatINR(personBalance.toGive)}</p>
              </div>
              <div className="rounded-xl bg-brand-50 p-3 text-center">
                <p className="text-[10px] font-bold text-brand-400 mb-1">Pending</p>
                <p className="font-bold text-brand-600 text-sm">{personBalance.pendingCount} persons</p>
              </div>
            </div>
          </div>
        )}

        {!expenses ? (
          <Skeleton />
        ) : (
          <>
            {/* Total spending */}
            <div className="card p-4 animate-fade-up stagger-1">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-bold text-brand-600">Total Spent</h2>
                <span className="text-xs text-brand-300">{PERIODS.find(p => p.days === period)?.label || 'All'}</span>
              </div>
              <p className="text-2xl font-extrabold text-brand-800 tabular">{formatINR(total)}</p>
              <p className="text-xs text-brand-300 mt-0.5">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Category chart */}
            {categoryData.length > 0 ? (
              <div className="card p-4 animate-fade-up stagger-2">
                <h2 className="text-sm font-bold text-brand-600 mb-4">By Category</h2>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%" cy="50%"
                        innerRadius={40} outerRadius={65}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="white"
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {categoryData.slice(0, 5).map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-brand-600 flex-1 truncate">{item.name}</span>
                        <span className="text-xs font-bold text-brand-700 tabular">{formatINR(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Daily bar chart */}
            {expenses.length > 0 && (
              <div className="card p-4 animate-fade-up stagger-3">
                <h2 className="text-sm font-bold text-brand-600 mb-4">Daily Spending</h2>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={barDataTrimmed} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8F0FB" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#93CAED' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#93CAED' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amt" name="Amount" fill="#4BB8FA" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Category list */}
            {categoryData.length > 0 && (
              <div className="card p-4 animate-fade-up stagger-4">
                <h2 className="text-sm font-bold text-brand-600 mb-3">Category Breakdown</h2>
                <div className="space-y-2">
                  {categoryData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#6B7280' }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-brand-700">{item.name}</span>
                          <span className="text-xs font-bold tabular text-brand-600">{formatINR(item.value)}</span>
                        </div>
                        <div className="h-1.5 bg-brand-50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${(item.value / total) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent expenses list */}
            {expenses.length > 0 && (
              <div className="card overflow-hidden animate-fade-up stagger-5">
                <div className="px-4 py-3 border-b border-brand-50">
                  <h2 className="text-sm font-bold text-brand-600">Recent Expenses</h2>
                </div>
                <div className="divide-y divide-brand-50">
                  {expenses.slice(0, 20).map(exp => (
                    <div key={exp.id} className="px-4 py-3 flex items-center gap-3">
                      <span className="text-base w-6 text-center"><span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: CATEGORY_COLORS[exp.category] || '#6B7280' }} /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-700 truncate">{exp.description || exp.category}</p>
                        <p className="text-xs text-brand-300">{formatDate(exp.date)} · {exp.category}</p>
                      </div>
                      <p className="font-bold tabular text-brand-600 text-sm flex-shrink-0">{formatINR(exp.amount)}</p>
                      <div className="flex gap-1">
                        <button onClick={() => setEditExpense(exp)} className="h-7 w-7 rounded-lg flex items-center justify-center text-brand-200 hover:text-brand-400 hover:bg-brand-50 transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => setDeleteId(exp.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-brand-200 hover:text-debit-500 hover:bg-debit-50 transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expenses.length === 0 && (
              <div className="card p-8 text-center animate-scale-in">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-50 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2C5EAD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
                </div>
                <h3 className="font-bold text-brand-800">No expenses yet</h3>
                <p className="text-brand-300 text-sm mt-1">Track your daily spending to see insights</p>
                <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">Add First Expense</button>
              </div>
            )}
          </>
        )}
      </div>

      {(showAdd || editExpense) && (
        <AddExpenseModal
          expense={editExpense}
          onClose={() => { setShowAdd(false); setEditExpense(null) }}
          onSaved={() => { setShowAdd(false); setEditExpense(null); load() }}
        />
      )}

      {deleteId && (
        <div className="modal-backdrop">
          <div className="modal-sheet animate-scale-in max-w-xs">
            <h3 className="font-bold text-brand-800 text-lg">Delete Expense?</h3>
            <p className="text-brand-400 text-sm mt-1">This expense will be permanently deleted.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
