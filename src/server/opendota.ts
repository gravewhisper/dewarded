import { parseMedal, pickRegion, type Medal, type Region, type RegionCounts } from '#/domain'
import { config } from './config'
import regionNames from './regions.json'

const API = 'https://api.opendota.com/api'

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
