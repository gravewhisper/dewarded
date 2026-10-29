import type { ClaimId, SteamIdentity } from '#/domain'
import { getClaimBySteamKey, getVerification, renameClaim, saveClaim, saveVerification } from './db'
import { checkSteamAccount, MEDAL_REUSE_MS, type CheckError, type CheckOptions } from './opendota'

export const REFRESH_COOLDOWN_MS = MEDAL_REUSE_MS

export type LinkError = CheckError | 'cooldown' | 'not_linked' | 'steam_again'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: LinkError }

export async function linkAccount(
  redditUsername: string,
  steam: SteamIdentity,
  options: CheckOptions = {},
): Promise<Result> {
  const checked = await checkSteamAccount(steam, options)
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
  steam: SteamIdentity | null,
  options: CheckOptions = {},
): Promise<Result> {
  const existing = await getVerification(redditUsername)
  if (!existing) return { ok: false, error: 'not_linked' }
  if (coolingDown(existing.checkedAt, options)) return { ok: false, error: 'cooldown' }
  if (!steam || steam.steamKey !== existing.steamKey) return { ok: false, error: 'steam_again' }
  return linkAccount(redditUsername, steam, options)
}

export async function claimAccount(
  steam: SteamIdentity,
  claimedRedditUsername: string,
  options: CheckOptions = {},
): Promise<Result<{ id: ClaimId }>> {
  const existing = await getClaimBySteamKey(steam.steamKey)
  if (existing && (await renameClaim(steam.steamKey, claimedRedditUsername))) {
    return { ok: true, id: existing.id }
  }
  const checked = await checkSteamAccount(steam, options)
  if (!checked.ok) return checked
  return { ok: true, id: await saveClaim(checked.check, claimedRedditUsername) }
}

export async function refreshClaim(
  steam: SteamIdentity,
  options: CheckOptions = {},
): Promise<Result<{ id: ClaimId }>> {
  const existing = await getClaimBySteamKey(steam.steamKey)
  if (!existing) return { ok: false, error: 'not_linked' }
  if (coolingDown(existing.checkedAt, options)) return { ok: false, error: 'cooldown' }
  const checked = await checkSteamAccount(steam, options)
  if (!checked.ok) return checked
  return { ok: true, id: await saveClaim(checked.check, existing.claimedRedditUsername) }
}
