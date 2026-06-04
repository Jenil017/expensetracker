import { useState, useEffect } from 'react'
import { usePinLock } from '../contexts/PinContext.jsx'
import { useToast } from './Toast.jsx'
import {
  isBiometricAvailable, hasBiometricRegistered,
  registerBiometric, removeBiometric,
} from '../utils/biometric.js'

// ── Shared numpad used across all PIN screens ────────────────────────────────
function PinScreen({ title, subtitle, onOK, onBack, okLabel = 'OK', error = '' }) {
  const [digits, setDigits] = useState([])
  const [shake, setShake]   = useState(false)

  // Expose shake trigger via ref-like approach
  useEffect(() => {
    if (error) { setShake(true); setDigits([]); setTimeout(() => setShake(false), 500) }
  }, [error])

  const press = (d) => {
    if (digits.length >= 4) return
    setDigits(prev => [...prev, d])
  }
  const del = () => setDigits(prev => prev.slice(0, -1))
  const submit = () => { if (digits.length === 4) onOK(digits.join('')) }

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="text-center">
        <p className="text-base font-bold text-brand-800">{title}</p>
        {subtitle && <p className="text-xs text-brand-400 mt-0.5">{subtitle}</p>}
      </div>

      {/* Dots */}
      <div className={`flex justify-center gap-5 ${shake ? 'animate-[shake_0.5s_ease]' : ''}`}>
        {[0,1,2,3].map(i => (
          <div key={i} className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
            i < digits.length ? 'bg-brand-500 border-brand-500 scale-110' : 'border-brand-200'
          }`} />
        ))}
      </div>

      {/* Error */}
      {error && <p className="text-center text-xs text-debit-600 font-medium -mt-2">{error}</p>}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2.5">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button
            key={n}
            onClick={() => press(String(n))}
            className="h-12 rounded-xl bg-brand-50 text-brand-800 text-lg font-semibold hover:bg-brand-100 active:scale-95 transition-all"
          >
            {n}
          </button>
        ))}
        {/* Back / Cancel */}
        <button
          onClick={onBack}
          className="h-12 rounded-xl text-brand-400 text-sm font-medium hover:bg-brand-50 active:scale-95 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={() => press('0')}
          className="h-12 rounded-xl bg-brand-50 text-brand-800 text-lg font-semibold hover:bg-brand-100 active:scale-95 transition-all"
        >
          0
        </button>
        {/* Backspace */}
        <button
          onClick={del}
          className="h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-400 hover:bg-brand-100 active:scale-95 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
            <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
      </div>

      {/* OK button */}
      <button
        onClick={submit}
        disabled={digits.length < 4}
        className="btn-primary w-full py-3 text-base disabled:opacity-40"
      >
        {okLabel}
      </button>
    </div>
  )
}

// ── Set / change PIN — two-step flow ─────────────────────────────────────────
function SetPinFlow({ onDone, onCancel }) {
  const { setPin } = usePinLock()
  const toast = useToast()
  const [step, setStep]   = useState('enter')   // 'enter' | 'confirm'
  const [first, setFirst] = useState('')
  const [err, setErr]     = useState('')

  const handleEnter = (pin) => { setFirst(pin); setErr(''); setStep('confirm') }

  const handleConfirm = async (pin) => {
    if (pin !== first) { setErr('PINs do not match. Try again.'); return }
    await setPin(pin)
    toast.success('PIN set successfully')
    onDone()
  }

  if (step === 'enter') {
    return (
      <PinScreen
        title="Create PIN"
        subtitle="Enter a 4-digit PIN"
        onOK={handleEnter}
        onBack={onCancel}
        okLabel="Next"
      />
    )
  }
  return (
    <PinScreen
      title="Re-enter PIN to confirm"
      subtitle="Enter the same PIN again"
      onOK={handleConfirm}
      onBack={() => { setStep('enter'); setFirst(''); setErr('') }}
      okLabel="OK — Save PIN"
      error={err}
    />
  )
}

// ── Remove PIN — verify current first ────────────────────────────────────────
function RemovePinFlow({ onDone, onCancel }) {
  const { verifyPin, removePin } = usePinLock()
  const toast = useToast()
  const [err, setErr] = useState('')

  const handle = async (pin) => {
    const ok = await verifyPin(pin)
    if (!ok) { setErr('Wrong PIN. Try again.'); return }
    removePin()
    toast.success('PIN removed')
    onDone()
  }

  return (
    <PinScreen
      title="Enter current PIN"
      subtitle="Confirm to remove PIN protection"
      onOK={handle}
      onBack={onCancel}
      okLabel="OK — Remove PIN"
      error={err}
    />
  )
}

// ── Main exported component ───────────────────────────────────────────────────
export default function PinSetup() {
  const { pinSet, lock } = usePinLock()
  const toast = useToast()
  const [flow, setFlow]       = useState(null)   // null | 'set' | 'remove'
  const [bioAvail, setBioAvail] = useState(false)
  const [bioOn, setBioOn]     = useState(false)
  const [bioLoading, setBioLoading] = useState(false)

  useEffect(() => {
    isBiometricAvailable().then(ok => {
      setBioAvail(ok)
      setBioOn(ok && hasBiometricRegistered())
    })
  }, [])

  const toggleBio = async () => {
    setBioLoading(true)
    try {
      if (bioOn) { removeBiometric(); setBioOn(false); toast.success('Biometric disabled') }
      else { await registerBiometric(); setBioOn(true); toast.success('Biometric enabled') }
    } catch (e) { toast.error('Biometric setup failed') }
    finally { setBioLoading(false) }
  }

  if (flow === 'set')    return <SetPinFlow    onDone={() => setFlow(null)} onCancel={() => setFlow(null)} />
  if (flow === 'remove') return <RemovePinFlow onDone={() => setFlow(null)} onCancel={() => setFlow(null)} />

  return (
    <div className="space-y-4">
      {/* PIN row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">PIN Lock</p>
          <p className="text-xs text-brand-300 mt-0.5">{pinSet ? 'App is PIN protected' : 'No PIN set'}</p>
        </div>
        <div className="flex gap-2">
          {pinSet ? (
            <>
              <button onClick={() => setFlow('set')}    className="btn-secondary btn-sm">Change</button>
              <button onClick={() => setFlow('remove')} className="btn-danger btn-sm">Remove</button>
            </>
          ) : (
            <button onClick={() => setFlow('set')} className="btn-primary btn-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Set PIN
            </button>
          )}
        </div>
      </div>

      {/* Biometric — only when PIN is set and device supports it */}
      {pinSet && bioAvail && (
        <div className="flex items-center justify-between pt-3 border-t border-brand-50">
          <div>
            <p className="text-sm font-semibold text-brand-700">Biometric Unlock</p>
            <p className="text-xs text-brand-300 mt-0.5">
              {bioOn ? 'Fingerprint / Face ID active' : 'Enable fingerprint or Face ID'}
            </p>
          </div>
          <button
            onClick={toggleBio}
            disabled={bioLoading}
            className={`relative h-7 w-12 rounded-full transition-colors duration-200 flex-shrink-0 ${bioOn ? 'bg-brand-500' : 'bg-brand-100'}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${bioOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      )}

      {/* Lock now */}
      {pinSet && (
        <button onClick={lock} className="btn-secondary w-full btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Lock App Now
        </button>
      )}
    </div>
  )
}
