import { NavLink } from 'react-router-dom'

const HomeIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const ChartIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)

const PersonIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const tabs = [
  { to: '/',           label: 'Home',      Icon: HomeIcon },
  { to: '/analytics',  label: 'Analytics', Icon: ChartIcon },
  { to: '/profile',    label: 'Profile',   Icon: PersonIcon },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav no-print fixed bottom-0 inset-x-0 z-40 bg-white shadow-bottom-nav border-t border-brand-100">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors min-h-[56px] ${
                isActive ? 'text-brand-500' : 'text-brand-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  {isActive && (
                    <span className="absolute -inset-1.5 rounded-xl bg-brand-50" />
                  )}
                  <span className="relative">
                    <Icon active={isActive} />
                  </span>
                </span>
                <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-brand-500' : 'text-brand-300'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
