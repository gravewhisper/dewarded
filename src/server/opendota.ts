import {
  parseMedal,
  pickRegion,
  steamId64ToAccountId,
  type Medal,
  type Region,
  type RegionCounts,
  type SteamCheck,
} from '#/domain'
import { config } from './config'
import { getLatestSteamCheck } from './db'
import regionNames from './regions.json'

const API = 'https://api.opendota.com/api'

export const MEDAL_REUSE_MS = 60 * 60 * 1000

export type OpenDotaResult =
  | { ok: true; medal: Medal; region: Region | null }
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
  try {
    const res = await fetch(`${API}/players/${accountId}/refresh`, {
      method: 'POST',
      headers: { 'User-Agent': config.userAgent },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) console.error(`OpenDota refresh returned ${res.status}`)
  } catch (err) {
    console.error(err)
  }
}

export async function fetchMedal(accountId: number): Promise<OpenDotaResult> {
  await requestRefresh(accountId)
  try {
    const [player, counts] = await Promise.all([
      getJson<PlayerResponse>(`/players/${accountId}`),
      getJson<CountsResponse>(`/players/${accountId}/counts?lobby_type=7`),
    ])
    if (!player.profile) return { ok: false, error: 'no_profile' }
    const medal = parseMedal(player.rank_tier, player.leaderboard_rank)
    if (!medal) {
      console.error(`OpenDota returned unexpected rank_tier ${player.rank_tier}`)
      return { ok: false, error: 'upstream' }
    }
    return { ok: true, medal, region: pickRegion(counts.region ?? {}, regionNames) }
  } catch (err) {
    if (err instanceof RateLimited) return { ok: false, error: 'rate_limited' }
    if (err instanceof NotIndexed) return { ok: false, error: 'no_profile' }
    console.error(err)
    return { ok: false, error: 'upstream' }
  }
}

export type CheckError = Extract<OpenDotaResult, { ok: false }>['error']

export type CheckResult = { ok: true; check: SteamCheck } | { ok: false; error: CheckError }

export type CheckOptions = { now?: Date }

type Plan = { kind: 'reuse'; check: SteamCheck } | { kind: 'fetch' }

function planCheck(previous: SteamCheck | null, now: Date): Plan {
  if (previous && previous.checkedAt.getTime() + MEDAL_REUSE_MS > now.getTime()) {
    return { kind: 'reuse', check: previous }
  }
  return { kind: 'fetch' }
}

export async function checkSteamAccount(
  steamId64: string,
  { now = new Date() }: CheckOptions = {},
): Promise<CheckResult> {
  const plan = planCheck(await getLatestSteamCheck(steamId64), now)
  if (plan.kind === 'reuse') return { ok: true, check: plan.check }
  const accountId = steamId64ToAccountId(steamId64)
  const result = await fetchMedal(accountId)
  if (!result.ok) return result
  return {
    ok: true,
    check: { steamId64, accountId, medal: result.medal, region: result.region, checkedAt: now },
  }
}
