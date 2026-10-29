import { randomBytes } from 'node:crypto'
import { parseSteamId64, type SteamId64 } from '#/domain'
import { callbackUrl, config } from './config'

const OP_ENDPOINT = 'https://steamcommunity.com/openid/login'
const CLAIMED_ID = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/
const IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select'
const MUST_BE_SIGNED = ['claimed_id', 'identity', 'return_to', 'response_nonce', 'op_endpoint']

export const STEAM_CALLBACK_PATH = '/auth/steam/callback'

export function newSteamNonce(): string {
  return randomBytes(18).toString('base64url')
}

function returnTo(nonce: string): string {
  return `${callbackUrl(STEAM_CALLBACK_PATH)}?n=${nonce}`
}

export function steamLoginUrl(nonce: string): string {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo(nonce),
    'openid.realm': config.publicUrl,
    'openid.identity': IDENTIFIER_SELECT,
    'openid.claimed_id': IDENTIFIER_SELECT,
  })
  return `${OP_ENDPOINT}?${params}`
}

export type SteamVerifyError = 'steam_session' | 'malformed' | 'rejected' | 'unreachable'

export async function verifySteamCallback(
  query: URLSearchParams,
  sessionNonce: string | undefined,
): Promise<{ ok: true; steamId64: SteamId64 } | { ok: false; error: SteamVerifyError }> {
  if (query.get('openid.mode') !== 'id_res') return { ok: false, error: 'malformed' }
  if (!sessionNonce || query.get('openid.return_to') !== returnTo(sessionNonce)) {
    return { ok: false, error: 'steam_session' }
  }
  if (query.get('openid.op_endpoint') !== OP_ENDPOINT) return { ok: false, error: 'malformed' }
  const claimedId = query.get('openid.claimed_id') ?? ''
  const steamId64 = parseSteamId64(CLAIMED_ID.exec(claimedId)?.[1] ?? '')
  if (!steamId64 || query.get('openid.identity') !== claimedId) {
    return { ok: false, error: 'malformed' }
  }
  // check_authentication only vouches for the signed fields, so an unsigned
  // claimed_id could be swapped while is_valid still comes back true.
  const signed = new Set((query.get('openid.signed') ?? '').split(','))
  if (!MUST_BE_SIGNED.every((field) => signed.has(field))) {
    return { ok: false, error: 'malformed' }
  }

  const body = new URLSearchParams()
  for (const [key, value] of query) {
    if (key.startsWith('openid.')) body.set(key, value)
  }
  body.set('openid.mode', 'check_authentication')

  let text: string
  try {
    const res = await fetch(OP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) return { ok: false, error: 'unreachable' }
    text = await res.text()
  } catch {
    return { ok: false, error: 'unreachable' }
  }
  const valid = text.split('\n').some((line) => line.trim() === 'is_valid:true')
  return valid ? { ok: true, steamId64 } : { ok: false, error: 'rejected' }
}
