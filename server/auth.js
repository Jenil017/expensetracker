import './env.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-in-prod'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

// In-memory blocklist for logout revocation (resets on server restart — acceptable for this use case)
const revokedTokens = new Set()

export function revokeToken(token) {
  revokedTokens.add(token)
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' })
}

export function authMiddleware(req, res, next) {
  const auth = req.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  if (revokedTokens.has(token)) return res.status(401).json({ error: 'Token revoked' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.sub
    req.token = token
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export async function verifyGoogleToken(credential) {
  if (!googleClient) throw Object.assign(new Error('Google OAuth not configured'), { status: 400 })
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  })
  return ticket.getPayload()
}

export const hashPassword = (pw) => bcrypt.hash(pw, 10)
export const comparePassword = (pw, hash) => bcrypt.compare(pw, hash)
