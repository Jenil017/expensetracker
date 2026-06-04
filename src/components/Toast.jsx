import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const show = useCallback((message, type = 'success') => {
    const id = ++idRef.current
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const success = useCallback((m) => show(m, 'success'), [show])
  const error = useCallback((m) => show(m, 'error'), [show])
  const info = useCallback((m) => show(m, 'info'), [show])

  return (
    <ToastCtx.Provider value={{ show, success, error, info }}>
      {children}
      <div className="fixed top-4 left-1/2 z-[9999] flex -translate-x-1/2 flex-col gap-2 items-center w-full max-w-sm px-4 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`animate-fade-up w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-card-lg text-white flex items-center gap-2.5 ${
              t.type === 'success' ? 'bg-credit-gradient' :
              t.type === 'error'   ? 'bg-debit-gradient'  :
              'bg-brand-gradient'
            }`}
          >
            <span className="text-base">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
