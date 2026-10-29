import { steamId64ToAccountId, type ClaimId, type SteamCheck } from '#/domain'
import { getClaimBySteamId, getVerification, renameClaim, saveClaim, saveVerification } from './db'
import { fetchMedal } from './opendota'

export const REFRESH_COOLDOWN_MS = 60 * 60 * 1000

export type LinkError = 'rate_limited' | 'no_profile' | 'upstream' | 'cooldown' | 'not_linked'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: LinkError }

async function checkSteamAccount(steamId64: string): Promise<Result<{ check: SteamCheck }>> {
  const accountId = steamId64ToAccountId(steamId64)
  const result = await fetchMedal(accountId)
  if (!result.ok) return result
  return {
    ok: true,
    check: { steamId64, accountId, medal: result.medal, region: result.region, checkedAt: new Date() },
  }
}

export async function linkAccount(redditUsername: string, steamId64: string): Promise<Result> {
  const checked = await checkSteamAccount(steamId64)
  if (!checked.ok) return checked
  await saveVerification({ ...checked.check, redditUsername })
  return { ok: true }
}

export function nextRefreshAt(checkedAt: Date): Date {
  return new Date(checkedAt.getTime() + REFRESH_COOLDOWN_MS)
}

function coolingDown(checkedAt: Date): boolean {
  return nextRefreshAt(checkedAt).getTime() > Date.now()
}

export async function refreshAccount(redditUsername: string): Promise<Result> {
  const existing = await getVerification(redditUsername)
  if (!existing) return { ok: false, error: 'not_linked' }
  if (coolingDown(existing.checkedAt)) return { ok: false, error: 'cooldown' }
  return linkAccount(redditUsername, existing.steamId64)
}

export async function claimAccount(
  steamId64: string,
  claimedRedditUsername: string,
): Promise<Result<{ id: ClaimId }>> {
  const existing = await getClaimBySteamId(steamId64)
  if (existing && (await renameClaim(steamId64, claimedRedditUsername))) {
    return { ok: true, id: existing.id }
  }
  const checked = await checkSteamAccount(steamId64)
  if (!checked.ok) return checked
  return { ok: true, id: await saveClaim(checked.check, claimedRedditUsername) }
}

export async function refreshClaim(steamId64: string): Promise<Result<{ id: ClaimId }>> {
  const existing = await getClaimBySteamId(steamId64)
  if (!existing) return { ok: false, error: 'not_linked' }
  if (coolingDown(existing.checkedAt)) return { ok: false, error: 'cooldown' }
  const checked = await checkSteamAccount(steamId64)
  if (!checked.ok) return checked
  return { ok: true, id: await saveClaim(checked.check, existing.claimedRedditUsername) }
}
