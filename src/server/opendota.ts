import {
  parseMedal,
  pickRegion,
  steamId64ToAccountId,
  type KnownRegion,
  type Medal,
  type RegionCounts,
  type SteamCheck,
  type SteamIdentity,
} from '#/domain'
import { config } from './config'
import { getLatestSteamCheck, pauseOpenDota, reserveOpenDotaCalls, type CallLimits } from './db'
import regionNames from './regions.json'

const API = 'https://api.opendota.com/api'

export const MEDAL_REUSE_MS = 60 * 60 * 1000

export const REGION_REUSE_MS = 24 * 60 * 60 * 1000

export const RATE_LIMIT_PAUSE_MS = 60 * 1000

export const OPENDOTA_LIMITS: CallLimits = { perMinute: 50, perDay: 2800 }

export type OpenDotaResult =
  | ({ ok: true; medal: Medal } & KnownRegion)
  | { ok: false; error: 'rate_limited' | 'no_profile' | 'upstream' }

type PlayerResponse = {
  profile?: { steamid?: string }
  rank_tier?: number | null
  leaderboard_rank?: number | null
}

type CountsResponse = { region?: RegionCounts }

class RateLimited extends Error {}

class NotIndexed extends Error {}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'User-Agent': config.userAgent },
    signal: AbortSignal.timeout(8000),
  })
  if (res.status === 429) throw new RateLimited()
  if (res.status === 404) throw new NotIndexed()
  if (!res.ok) throw new Error(`OpenDota returned ${res.status}`)
  return (await res.json()) as T
}

async function requestRefresh(accountId: number): Promise<void> {
  const res = await fetch(`${API}/players/${accountId}/refresh`, {
    method: 'POST',
    headers: { 'User-Agent': config.userAgent },
    signal: AbortSignal.timeout(5000),
  }).catch((err: unknown) => {
    console.error(err)
    return null
  })
  if (res?.status === 429) throw new RateLimited()
  if (res && !res.ok) console.error(`OpenDota refresh returned ${res.status}`)
}

async function fetchRegion(accountId: number, now: Date): Promise<KnownRegion> {
  const counts = await getJson<CountsResponse>(`/players/${accountId}/counts?lobby_type=7`)
  return { region: pickRegion(counts.region ?? {}, regionNames), regionCheckedAt: now }
}

export async function fetchMedal(
  accountId: number,
  keptRegion: KnownRegion | null = null,
  now = new Date(),
): Promise<OpenDotaResult> {
  try {
    await requestRefresh(accountId)
    const [player, known] = await Promise.all([
      getJson<PlayerResponse>(`/players/${accountId}`),
      keptRegion ?? fetchRegion(accountId, now),
    ])
    if (!player.profile) return { ok: false, error: 'no_profile' }
    const medal = parseMedal(player.rank_tier, player.leaderboard_rank)
    if (!medal) {
      console.error(`OpenDota returned unexpected rank_tier ${player.rank_tier}`)
      return { ok: false, error: 'upstream' }
    }
    return { ok: true, medal, ...known }
  } catch (err) {
    if (err instanceof RateLimited) return { ok: false, error: 'rate_limited' }
    if (err instanceof NotIndexed) return { ok: false, error: 'no_profile' }
    console.error(err)
    return { ok: false, error: 'upstream' }
  }
}

export type CheckError = Extract<OpenDotaResult, { ok: false }>['error'] | 'busy'

export type CheckResult = { ok: true; check: SteamCheck } | { ok: false; error: CheckError }

export type CheckOptions = { now?: Date; limits?: CallLimits }

type Plan =
  | { kind: 'reuse'; check: SteamCheck }
  | { kind: 'fetch'; calls: number; keptRegion: KnownRegion | null }

const fresh = (at: Date, maxAgeMs: number, now: Date) => at.getTime() + maxAgeMs > now.getTime()

function planCheck(previous: SteamCheck | null, now: Date): Plan {
  if (previous && fresh(previous.checkedAt, MEDAL_REUSE_MS, now)) {
    return { kind: 'reuse', check: previous }
  }
  if (previous && fresh(previous.regionCheckedAt, REGION_REUSE_MS, now)) {
    const { region, regionCheckedAt } = previous
    return { kind: 'fetch', calls: 2, keptRegion: { region, regionCheckedAt } }
  }
  return { kind: 'fetch', calls: 3, keptRegion: null }
}

export async function checkSteamAccount(
  { steamId64, steamKey }: SteamIdentity,
  { now = new Date(), limits = OPENDOTA_LIMITS }: CheckOptions = {},
): Promise<CheckResult> {
  const plan = planCheck(await getLatestSteamCheck(steamKey), now)
  if (plan.kind === 'reuse') return { ok: true, check: plan.check }
  const reservation = await reserveOpenDotaCalls(plan.calls, now, limits)
  if (reservation === 'paused') return { ok: false, error: 'rate_limited' }
  if (reservation === 'busy') return { ok: false, error: 'busy' }
  const result = await fetchMedal(steamId64ToAccountId(steamId64), plan.keptRegion, now)
  if (!result.ok && result.error === 'rate_limited') {
    await pauseOpenDota(new Date(now.getTime() + RATE_LIMIT_PAUSE_MS))
  }
  if (!result.ok) return result
  const { ok: _, ...found } = result
  return { ok: true, check: { steamKey, ...found, checkedAt: now } }
}
