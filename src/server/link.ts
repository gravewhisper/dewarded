import type { ClaimId } from '#/domain'
import { getClaimBySteamId, getVerification, renameClaim, saveClaim, saveVerification } from './db'
import { checkSteamAccount, type CheckError, type CheckOptions } from './opendota'

export const REFRESH_COOLDOWN_MS = 60 * 60 * 1000

export type LinkError = CheckError | 'cooldown' | 'not_linked'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: LinkError }

export async function linkAccount(
  redditUsername: string,
  steamId64: string,
  options: CheckOptions = {},
): Promise<Result> {
  const checked = await checkSteamAccount(steamId64, options)
  if (!checked.ok) return checked
  await saveVerification({ ...checked.check, redditUsername })
  return { ok: true }
}

export function nextRefreshAt(checkedAt: Date): Date {
  return new Date(checkedAt.getTime() + REFRESH_COOLDOWN_MS)
}

function coolingDown(checkedAt: Date, { now = new Date() }: CheckOptions): boolean {
  return nextRefreshAt(checkedAt).getTime() > now.getTime()
}

export async function refreshAccount(
  redditUsername: string,
  options: CheckOptions = {},
): Promise<Result> {
  const existing = await getVerification(redditUsername)
  if (!existing) return { ok: false, error: 'not_linked' }
  if (coolingDown(existing.checkedAt, options)) return { ok: false, error: 'cooldown' }
  return linkAccount(redditUsername, existing.steamId64, options)
}

export async function claimAccount(
  steamId64: string,
  claimedRedditUsername: string,
  options: CheckOptions = {},
): Promise<Result<{ id: ClaimId }>> {
  const existing = await getClaimBySteamId(steamId64)
  if (existing && (await renameClaim(steamId64, claimedRedditUsername))) {
    return { ok: true, id: existing.id }
  }
  const checked = await checkSteamAccount(steamId64, options)
  if (!checked.ok) return checked
  return { ok: true, id: await saveClaim(checked.check, claimedRedditUsername) }
}

export async function refreshClaim(
  steamId64: string,
  options: CheckOptions = {},
): Promise<Result<{ id: ClaimId }>> {
  const existing = await getClaimBySteamId(steamId64)
  if (!existing) return { ok: false, error: 'not_linked' }
  if (coolingDown(existing.checkedAt, options)) return { ok: false, error: 'cooldown' }
  const checked = await checkSteamAccount(steamId64, options)
  if (!checked.ok) return checked
  return { ok: true, id: await saveClaim(checked.check, existing.claimedRedditUsername) }
}
