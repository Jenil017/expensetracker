import { useEffect, useState } from 'react'
import { canInstall, isStandalone, isIOS, promptInstall } from '../pwa.js'

const DISMISSED_KEY = 'txbuddy_install_dismissed'

export default function InstallBanner() {
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    const ios = isIOS()
    setIos(ios)

    if (ios) {
      // On iOS Safari there is no beforeinstallprompt — show manual instructions
      setShow(true)
      return
    }

    // Chrome / Android / Edge — wait for the browser prompt event
    const update = () => setShow(canInstall() && !isStandalone())
    update()
    window.addEventListener('pwa:changed', update)
    return () => window.removeEventListener('pwa:changed', update)
  }, [])

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-left animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-brand-gradient flex items-center justify-center flex-shrink-0 shadow-fab">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-700">Install Transaction Buddy</p>
          {ios ? (
            <p className="text-xs text-brand-400 mt-0.5 leading-relaxed">
              Tap the <strong>Share</strong> button in Safari, then select <strong>"Add to Home Screen"</strong>
            </p>
          ) : (
            <p className="text-xs text-brand-400 mt-0.5">
              Add to your home screen for the best experience
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-brand-300 hover:bg-brand-100 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {!ios && (
        <button
          onClick={async () => { await promptInstall(); dismiss() }}
          className="btn-primary w-full mt-3 py-2.5 text-sm"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Install App
        </button>
      )}
    </div>
  )
}
