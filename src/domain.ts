export type RankedTier = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type Stars = 1 | 2 | 3 | 4 | 5

export type Medal =
  | { kind: 'uncalibrated' }
  | { kind: 'ranked'; tier: RankedTier; stars: Stars }
  | { kind: 'immortal'; leaderboardRank: number | null }

export type Region = { name: string; games: number; share: number }

export type Verification = {
  redditUsername: string
  steamId64: string
  accountId: number
  medal: Medal
  region: Region | null
  checkedAt: Date
}

export type PublicVerification = Pick<
  Verification,
  'redditUsername' | 'medal' | 'region' | 'checkedAt'
>

export function publicVerification(v: Verification): PublicVerification {
  return {
    redditUsername: v.redditUsername,
    medal: v.medal,
    region: v.region,
    checkedAt: v.checkedAt,
  }
}

export type RegionCounts = Record<string, { games: number }>

const STEAM_ID64_BASE = 76561197960265728n

const MEDAL_NAMES = [
  'Uncalibrated',
  'Herald',
  'Guardian',
  'Crusader',
  'Archon',
  'Legend',
  'Ancient',
  'Divine',
  'Immortal',
] as const

export function steamId64ToAccountId(steamId64: string): number {
  return Number(BigInt(steamId64) - STEAM_ID64_BASE)
}

// Returns null for a rank_tier outside OpenDota's documented encoding, so a
// malformed upstream value surfaces as an error instead of a wrong medal.
export function parseMedal(
  rankTier: number | null | undefined,
  leaderboardRank: number | null | undefined,
): Medal | null {
  if (rankTier == null || rankTier === 0) return { kind: 'uncalibrated' }
  const tier = Math.floor(rankTier / 10)
  const stars = rankTier % 10
  if (tier === 8) {
    return { kind: 'immortal', leaderboardRank: leaderboardRank || null }
  }
  if (tier >= 1 && tier <= 7 && stars >= 1 && stars <= 5) {
    return { kind: 'ranked', tier: tier as RankedTier, stars: stars as Stars }
  }
  return null
}

export function pickRegion(
  counts: RegionCounts,
  regionNames: Record<string, string>,
): Region | null {
  const gamesByName = new Map<string, number>()
  let total = 0
  for (const [key, { games }] of Object.entries(counts)) {
    const id = Number(key)
    if (!Number.isInteger(id) || games <= 0) continue
    const name = regionNames[key] ?? `Region ${id}`
    gamesByName.set(name, (gamesByName.get(name) ?? 0) + games)
    total += games
  }
  let best: Region | null = null
  for (const [name, games] of gamesByName) {
    if (!best || games > best.games) best = { name, games, share: games / total }
  }
  return best
}

export function medalLabel(medal: Medal): string {
  switch (medal.kind) {
    case 'uncalibrated':
      return MEDAL_NAMES[0]
    case 'ranked':
      return `${MEDAL_NAMES[medal.tier]} ${medal.stars}`
    case 'immortal':
      return medal.leaderboardRank === null
        ? MEDAL_NAMES[8]
        : `${MEDAL_NAMES[8]} #${medal.leaderboardRank}`
  }
}

export type MedalArt = { icon: string; star: string | null; boardRank: number | null }

const medalImage = (name: string) => `/medals/${name}.png`

export function medalArt(medal: Medal): MedalArt {
  switch (medal.kind) {
    case 'uncalibrated':
      return { icon: medalImage('rank_icon_0'), star: null, boardRank: null }
    case 'ranked':
      return {
        icon: medalImage(`rank_icon_${medal.tier}`),
        star: medalImage(`rank_star_${medal.stars}`),
        boardRank: null,
      }
    case 'immortal': {
      const rank = medal.leaderboardRank
      const variant = rank === null ? '8' : rank <= 10 ? '8c' : rank <= 100 ? '8b' : '8'
      return { icon: medalImage(`rank_icon_${variant}`), star: null, boardRank: rank }
    }
  }
}

export function regionLabel(region: Region): string {
  return `most ranked games in ${region.name}, ${Math.round(region.share * 100)}%`
}

export function normalizeRedditUsername(name: string): string {
  return name.trim().toLowerCase()
}
