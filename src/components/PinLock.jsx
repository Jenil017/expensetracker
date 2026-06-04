import { useState, useEffect, useCallback } from 'react'
import { usePinLock } from '../contexts/PinContext.jsx'
import { verifyBiometric, hasBiometricRegistered, isBiometricAvailable } from '../utils/biometric.js'

const DOTS = 4

export default function PinLock() {
  const { verifyPin, unlock } = usePinLock()
  const [digits, setDigits] = useState([])
  const [shake, setShake]   = useState(false)
  const [error, setError]   = useState('')
  const [bioAvail, setBioAvail] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)

  useEffect(() => {
    isBiometricAvailable().then(ok => setBioAvail(ok && hasBiometricRegistered()))
  }, [])

  const press = useCallback(async (d) => {
    if (digits.length >= DOTS) return
    const next = [...digits, d]
    setDigits(next)
    setError('')

    if (next.length === DOTS) {
      const ok = await verifyPin(next.join(''))
      if (ok) {
        unlock()
      } else {
        setShake(true)
        setTimeout(() => { setShake(false); setDigits([]) }, 600)
        setError('Wrong PIN')
      }
    }
  }, [digits, verifyPin, unlock])

  const del = useCallback(() => setDigits(d => d.slice(0, -1)), [])

  const tryBiometric = async () => {
    setBioLoading(true)
    try {
      await verifyBiometric()
      unlock()
    } catch {
      setError('Biometric failed. Use PIN.')
    } finally {
      setBioLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-brand-gradient flex flex-col items-center justify-center px-6 safe-top safe-bottom">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
            <rect x="4" y="4" width="12" height="28" rx="3" fill="white" opacity="0.9"/>
            <rect x="20" y="4" width="12" height="28" rx="3" fill="white" opacity="0.6"/>
          </svg>
        </div>
        <p className="text-white font-bold text-xl">Transaction Buddy</p>
        <p className="text-white/60 text-sm mt-1">Enter your PIN to unlock</p>
      </div>

      {/* Dots */}
      <div className={`flex gap-5 mb-8 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
        {Array.from({ length: DOTS }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
              i < digits.length
                ? 'bg-white border-white scale-110'
                : 'border-white/40'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-debit-300 text-sm mb-4 animate-fade-up">{error}</p>}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <KeyBtn key={n} label={String(n)} onPress={() => press(String(n))} />
        ))}
        {/* Bio or empty */}
        <div>
          {bioAvail ? (
            <button
              onClick={tryBiometric}
              disabled={bioLoading}
              className="w-full h-14 rounded-2xl bg-white/15 flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all"
            >
              {bioLoading
                ? <div className="h-5 w-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12s1 4 4 4 4-4 4-4"/><path d="M9 9h.01M15 9h.01"/></svg>
              }
            </button>
          ) : <div />}
        </div>
        <KeyBtn label="0" onPress={() => press('0')} />
        {/* Backspace */}
        <button
          onClick={del}
          className="w-full h-14 rounded-2xl bg-white/15 flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
            <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function KeyBtn({ label, onPress }) {
  return (
    <button
      onClick={onPress}
      className="w-full h-14 rounded-2xl bg-white/15 text-white text-xl font-semibold hover:bg-white/25 active:scale-95 transition-all"
    >
      {label}
    </button>
  )
}
