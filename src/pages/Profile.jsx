import { useState } from 'react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../components/Toast.jsx'
import PinSetup from '../components/PinSetup.jsx'
import { formatDate } from '../utils/format.js'

function UserAvatar({ user, size = 'lg' }) {
  const dim = size === 'lg' ? 'h-20 w-20 rounded-3xl text-3xl' : 'h-10 w-10 rounded-xl text-base'
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className={`${dim} object-cover border-2 border-white/20`}
      />
    )
  }
  return (
    <div className={`${dim} bg-white/20 flex items-center justify-center`}>
      <svg
        viewBox="0 0 24 24"
        fill="white"
        className={size === 'lg' ? 'h-10 w-10' : 'h-5 w-5'}
      >
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    </div>
  )
}

export default function Profile() {
  const { user, logout, updateUser } = useAuth()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [busy, setBusy] = useState(false)
  const [showLogout, setShowLogout] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Name is required')
    setBusy(true)
    try {
      await updateUser({ name: name.trim() })
      toast.success('Profile updated')
      setEditing(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="bg-brand-gradient safe-top">
        <div className="page-inner pt-4 pb-8">
          <h1 className="text-white font-bold text-xl">Profile</h1>
          <div className="mt-5 flex flex-col items-center">
            <UserAvatar user={user} size="lg" />
            <h2 className="mt-3 text-white font-bold text-xl">{user?.name}</h2>
            <p className="text-brand-200 text-sm">{user?.email}</p>
            <span className="mt-2 px-3 py-1 rounded-full bg-white/15 text-white/80 text-xs font-medium">
              {user?.provider === 'google' ? 'Google Account' : 'Email Account'}
            </span>
          </div>
        </div>
      </div>

      <div className="page-inner -mt-4 space-y-4 pb-4">
        {/* Edit details */}
        <div className="card p-4 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-brand-600">Account Details</h3>
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">Edit</button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="label">Display Name</label>
                <input
                  className="input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setEditing(false); setName(user?.name || '') }} className="btn-secondary flex-1 btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 btn-sm" disabled={busy}>
                  {busy ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2.5">
              <InfoRow label="Name" value={user?.name} />
              <InfoRow label="Email" value={user?.email} />
              <InfoRow label="Member since" value={formatDate(user?.createdAt)} />
            </div>
          )}
        </div>

        {/* App info */}
        <div className="card p-4 animate-fade-up stagger-1">
          <h3 className="text-sm font-semibold text-brand-600 mb-3">About Transaction Buddy</h3>
          <div className="space-y-2.5">
            <InfoRow label="Version" value="2.0.0" />
            <InfoRow label="Platform" value="PWA — Web App" />
          </div>
          <p className="text-xs text-brand-300 mt-3 leading-relaxed">
            Track money with friends, family, and customers. Add sent and received entries,
            download PDF statements, and monitor your expenses — all in one place.
          </p>
        </div>

        {/* PIN & Biometric lock */}
        <div className="card p-4 animate-fade-up stagger-2">
          <h3 className="text-sm font-semibold text-brand-600 mb-4">Security</h3>
          <PinSetup />
        </div>

        {/* Install tip */}
        <div className="card p-4 bg-brand-50 border-brand-100 animate-fade-up stagger-2">
          <div className="flex gap-3 items-start">
            <div className="h-9 w-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C5EAD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-brand-700">Install as App</h3>
              <p className="text-xs text-brand-400 mt-0.5 leading-relaxed">
                For the best experience, add Transaction Buddy to your home screen. On iOS: tap Share, then "Add to Home Screen". On Android/Chrome: tap the install prompt.
              </p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="animate-fade-up stagger-3">
          <button onClick={() => setShowLogout(true)} className="btn-danger w-full py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {showLogout && (
        <div className="modal-backdrop">
          <div className="modal-sheet animate-scale-in max-w-xs">
            <h3 className="font-bold text-brand-800 text-lg">Sign Out?</h3>
            <p className="text-brand-400 text-sm mt-1">You will need to sign in again to access your khatabook.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowLogout(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={logout} className="btn-danger flex-1">Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-brand-50 last:border-0">
      <span className="text-xs font-medium text-brand-300">{label}</span>
      <span className="text-sm font-medium text-brand-700 text-right max-w-[60%] truncate">{value || '—'}</span>
    </div>
  )
}
