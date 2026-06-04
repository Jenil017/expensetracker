// Firebase initialization. The web config below is NOT secret — it only identifies
// your project; actual access is controlled by Firestore security rules + Google login.
// Values are read from Vite env vars (see .env.example / .env.local).
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Only this Google account may sign in (also enforced in firestore.rules).
export const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL || ''
