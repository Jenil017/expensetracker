const CRED_KEY = 'txbuddy_bio_cred'

function buf2b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}
function b642buf(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer
}

export async function isBiometricAvailable() {
  if (!window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch { return false }
}

export function hasBiometricRegistered() {
  return !!localStorage.getItem(CRED_KEY)
}

export async function registerBiometric() {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Transaction Buddy', id: window.location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: 'applock',
        displayName: 'App Lock',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  })
  localStorage.setItem(CRED_KEY, buf2b64(credential.rawId))
  return true
}

export async function verifyBiometric() {
  const credId = localStorage.getItem(CRED_KEY)
  if (!credId) throw new Error('No biometric registered')
  await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: b642buf(credId) }],
      userVerification: 'required',
      timeout: 60000,
    },
  })
  return true
}

export function removeBiometric() {
  localStorage.removeItem(CRED_KEY)
}
