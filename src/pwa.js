let deferredPrompt = null

export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
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
  e.preventDefault()
  deferredPrompt = e
  window.dispatchEvent(new Event('pwa:changed'))
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  window.dispatchEvent(new Event('pwa:changed'))
})

// Register SW in both dev and prod so install prompt fires everywhere
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  }
}
