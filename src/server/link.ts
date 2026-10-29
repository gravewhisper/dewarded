import { steamId64ToAccountId } from '#/domain'
import { getVerification, saveVerification } from './db'
import { fetchMedal } from './opendota'

export const REFRESH_COOLDOWN_MS = 60 * 60 * 1000

export type LinkError = 'rate_limited' | 'no_profile' | 'upstream' | 'cooldown' | 'not_linked'

export async function linkAccount(
  redditUsername: string,
  steamId64: string,
): Promise<{ ok: true } | { ok: false; error: LinkError }> {
  const accountId = steamId64ToAccountId(steamId64)
  const result = await fetchMedal(accountId)
  if (!result.ok) return result
  await saveVerification({
    redditUsername,
    steamId64,
    accountId,
    medal: result.medal,
    region: result.region,
    checkedAt: new Date(),
  })
  return { ok: true }
}

export function nextRefreshAt(checkedAt: Date): Date {
  return new Date(checkedAt.getTime() + REFRESH_COOLDOWN_MS)
}

export async function refreshAccount(
  redditUsername: string,
): Promise<{ ok: true } | { ok: false; error: LinkError }> {
  const existing = await getVerification(redditUsername)
  if (!existing) return { ok: false, error: 'not_linked' }
  if (nextRefreshAt(existing.checkedAt).getTime() > Date.now()) {
    return { ok: false, error: 'cooldown' }
  }
  return linkAccount(redditUsername, existing.steamId64)
}
