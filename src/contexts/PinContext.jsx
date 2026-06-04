import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const PIN_KEY   = 'txbuddy_pin_hash'
const UNLK_KEY  = 'txbuddy_unlocked' // sessionStorage — cleared on tab close

const Ctx = createContext(null)
export const usePinLock = () => useContext(Ctx)

async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + ':txbuddy2026'))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function PinProvider({ children }) {
  const [locked, setLocked] = useState(false)
  const [pinSet, setPinSet] = useState(false)

  useEffect(() => {
    const has = !!localStorage.getItem(PIN_KEY)
    setPinSet(has)
    if (has && !sessionStorage.getItem(UNLK_KEY)) setLocked(true)
  }, [])

  const unlock = useCallback(() => {
    sessionStorage.setItem(UNLK_KEY, '1')
    setLocked(false)
  }, [])

  const lock = useCallback(() => {
    sessionStorage.removeItem(UNLK_KEY)
    setLocked(true)
  }, [])

  const setPin = useCallback(async (pin) => {
    const h = await hashPin(pin)
    localStorage.setItem(PIN_KEY, h)
    setPinSet(true)
    unlock()
  }, [unlock])

  const verifyPin = useCallback(async (pin) => {
    const stored = localStorage.getItem(PIN_KEY)
    if (!stored) return false
    const h = await hashPin(pin)
    return h === stored
  }, [])

  const removePin = useCallback(() => {
    localStorage.removeItem(PIN_KEY)
    setPinSet(false)
    unlock()
  }, [unlock])

  return (
    <Ctx.Provider value={{ locked, pinSet, lock, unlock, setPin, verifyPin, removePin }}>
      {children}
    </Ctx.Provider>
  )
}
