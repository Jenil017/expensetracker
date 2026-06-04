import { useEffect, useState } from 'react'
import { canInstall, isStandalone, promptInstall } from './pwa.js'

// "Install app" button — only renders when the browser says the app is installable
// (and it isn't already running as an installed app). Used on the login screen.
export default function InstallButton() {
  const [show, setShow] = useState(() => canInstall() && !isStandalone())

  useEffect(() => {
    const update = () => setShow(canInstall() && !isStandalone())
    window.addEventListener('pwa:changed', update)
    return () => window.removeEventListener('pwa:changed', update)
  }, [])

  if (!show) return null

  return (
    <button type="button" onClick={() => promptInstall()} className="btn-secondary mt-4 w-full">
      <span aria-hidden="true">⬇</span> Install app
    </button>
  )
}
