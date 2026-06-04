import { Link } from 'react-router-dom'
import { formatINR, getInitials, avatarColor } from '../utils/format.js'

export default function PersonCard({ person, index = 0 }) {
  const [bg, text] = avatarColor(person.name)
  const balance = Number(person.balance) || 0
  const isPositive = balance > 0
  const isZero = balance === 0

  return (
    <Link
      to={`/persons/${person.id}`}
      className={`card card-hover block p-4 animate-fade-up stagger-${Math.min(index + 1, 5)}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: bg, color: text }}
        >
          {getInitials(person.name)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brand-800 truncate text-base leading-tight">{person.name}</p>
          <p className="text-xs text-brand-300 mt-0.5">
            {person.txnCount > 0 ? `${person.txnCount} entr${person.txnCount !== 1 ? 'ies' : 'y'}` : 'No entries yet'}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className={`font-bold tabular text-base leading-tight ${
            isZero ? 'text-brand-300' : isPositive ? 'text-credit-600' : 'text-debit-600'
          }`}>
            {isZero ? '0' : formatINR(balance)}
          </p>
          <p className={`text-[10px] font-semibold mt-0.5 uppercase tracking-wide ${
            isZero ? 'text-brand-200' : isPositive ? 'text-credit-500' : 'text-debit-500'
          }`}>
            {isZero ? 'Settled' : isPositive ? 'To Collect' : 'To Pay'}
          </p>
        </div>
      </div>
    </Link>
  )
}
