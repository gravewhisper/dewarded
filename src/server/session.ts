import { createHmac, timingSafeEqual } from 'node:crypto'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { config } from './config'

export type Session = {
  redditUsername?: string
  redditState?: string
}

const COOKIE = 'medallion_session'
const MAX_AGE_S = 7 * 24 * 60 * 60

function sign(body: string): string {
  return createHmac('sha256', config.sessionSecret).update(body).digest('base64url')
}

export function readSession(): Session {
  const raw = getCookie(COOKIE)
  if (!raw) return {}
  const [body, sig] = raw.split('.')
  if (!body || !sig) return {}
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return {}
  try {
    const { exp, ...session } = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return typeof exp === 'number' && exp > Date.now() ? (session as Session) : {}
  } catch {
    return {}
  }
}

export function writeSession(session: Session): void {
  const body = Buffer.from(
    JSON.stringify({ ...session, exp: Date.now() + MAX_AGE_S * 1000 }),
  ).toString('base64url')
  // SameSite=Lax rather than Strict: the cookie must survive the top-level
  // redirect back from Reddit and Steam, and Lax still withholds it from
  // cross-site POSTs to the unlink and delete actions.
  setCookie(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
    maxAge: MAX_AGE_S,
  })
}

export function clearSession(): void {
  deleteCookie(COOKIE, { path: '/' })
}
