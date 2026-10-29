import { randomBytes } from 'node:crypto'
import { callbackUrl, config } from './config'

export const REDDIT_CALLBACK_PATH = '/auth/reddit/callback'

type Credentials = NonNullable<typeof config.reddit>

export function newState(): string {
  return randomBytes(24).toString('base64url')
}

export function redditAuthorizeUrl(creds: Credentials, state: string): string {
  const params = new URLSearchParams({
    client_id: creds.clientId,
    response_type: 'code',
    state,
    redirect_uri: callbackUrl(REDDIT_CALLBACK_PATH),
    duration: 'temporary',
    scope: 'identity',
  })
  return `https://www.reddit.com/api/v1/authorize?${params}`
}

export async function exchangeCodeForUsername(
  creds: Credentials,
  code: string,
): Promise<string | null> {
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')
  const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': config.userAgent,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl(REDDIT_CALLBACK_PATH),
    }),
  })
  if (!tokenRes.ok) return null
  const token = (await tokenRes.json()) as { access_token?: string }
  if (!token.access_token) return null

  const meRes = await fetch('https://oauth.reddit.com/api/v1/me', {
    headers: { Authorization: `Bearer ${token.access_token}`, 'User-Agent': config.userAgent },
  })
  if (!meRes.ok) return null
  const me = (await meRes.json()) as { name?: string }
  return typeof me.name === 'string' && me.name ? me.name : null
}
