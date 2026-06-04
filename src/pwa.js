// PWA install handling. The browser's install prompt (`beforeinstallprompt`) can fire
// before React mounts, so we capture it at module load and expose a tiny API + a
// `pwa:changed` event the UI can subscribe to.
let deferredPrompt = null

export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
}

export function canInstall() {
  return !!deferredPrompt
}

export async function promptInstall() {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  window.dispatchEvent(new Event('pwa:changed'))
  return outcome === 'accepted'
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault() // stop Chrome's default mini-infobar; we show our own button
  deferredPrompt = e
  window.dispatchEvent(new Event('pwa:changed'))
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  window.dispatchEvent(new Event('pwa:changed'))
})

// Register the service worker (production build only, to avoid clashing with dev HMR).
export function registerSW() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  }
}
