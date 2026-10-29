export type RankedTier = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type Stars = 1 | 2 | 3 | 4 | 5

export type Medal =
  | { kind: 'uncalibrated' }
  | { kind: 'ranked'; tier: RankedTier; stars: Stars }
  | { kind: 'immortal'; leaderboardRank: number | null }

export type Region = { name: string; games: number; share: number }

export type PublicRegion = { name: string; percent: number }

export function publicRegion(region: Region): PublicRegion {
  return { name: region.name, percent: Math.round(region.share * 100) }
}

export type SteamCheck = {
  steamId64: string
  accountId: number
  medal: Medal
  region: Region | null
  checkedAt: Date
}

export type MedalCheck = SteamCheck & { redditUsername: string }

export type Verification = MedalCheck & { selfReportedMmr: number | null }

export type PublicVerification = Pick<
  Verification,
  'redditUsername' | 'medal' | 'checkedAt' | 'selfReportedMmr'
> & { region: PublicRegion | null }

export function publicVerification(v: Verification): PublicVerification {
  return {
    redditUsername: v.redditUsername,
    medal: v.medal,
    region: v.region && publicRegion(v.region),
    checkedAt: v.checkedAt,
    selfReportedMmr: v.selfReportedMmr,
  }
}

export type ClaimId = string & { readonly __brand: 'ClaimId' }

export type Claim = SteamCheck & {
  id: ClaimId
  claimedRedditUsername: string
  selfReportedMmr: number | null
}

export type PublicClaim = Pick<
  Claim,
  'id' | 'claimedRedditUsername' | 'medal' | 'checkedAt' | 'selfReportedMmr'
> & { region: PublicRegion | null }

export function publicClaim(c: Claim): PublicClaim {
  return {
    id: c.id,
    claimedRedditUsername: c.claimedRedditUsername,
    medal: c.medal,
    region: c.region && publicRegion(c.region),
    checkedAt: c.checkedAt,
    selfReportedMmr: c.selfReportedMmr,
  }
}

const CLAIM_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'
export const CLAIM_ID_LENGTH = 10
const CLAIM_ID = new RegExp(`^[${CLAIM_ID_ALPHABET}]{${CLAIM_ID_LENGTH}}$`)

export function claimIdFromBytes(bytes: Uint8Array): ClaimId {
  if (bytes.length !== CLAIM_ID_LENGTH) throw new Error(`claim id needs ${CLAIM_ID_LENGTH} bytes`)
  return Array.from(bytes, (byte) => CLAIM_ID_ALPHABET[byte & 31]).join('') as ClaimId
}

export function parseClaimId(raw: string): ClaimId | null {
  return CLAIM_ID.test(raw) ? (raw as ClaimId) : null
}

export const REDDIT_USERNAME_PATTERN = '[A-Za-z0-9_\\-]{3,20}'
const REDDIT_USERNAME = new RegExp(`^${REDDIT_USERNAME_PATTERN}$`)

export function parseRedditUsername(raw: string): string | null {
  const name = raw.trim().replace(/^\/?u\//i, '')
  return REDDIT_USERNAME.test(name) ? normalizeRedditUsername(name) : null
}

export type VerifyMode = 'reddit' | 'backlink'

export function parseVerifyMode(raw: string | undefined): VerifyMode {
  if (raw === undefined || raw === '') return 'backlink'
  if (raw === 'reddit' || raw === 'backlink') return raw
  throw new Error(`VERIFY_MODE must be "reddit" or "backlink", got "${raw}"`)
}

export const MAX_MMR = 20000

export function parseMmrInput(raw: string): { ok: true; mmr: number | null } | { ok: false } {
  const text = raw.trim()
  if (text === '') return { ok: true, mmr: null }
  if (!/^\d+$/.test(text)) return { ok: false }
  const mmr = Number(text)
  return mmr >= MIN_SELF_REPORTED_MMR && mmr <= MAX_MMR ? { ok: true, mmr } : { ok: false }
}

export function mmrAllowed(medal: Medal): boolean {
  return medal.kind === 'immortal'
}

export function carriedMmr(
  previous: Pick<Verification, 'steamId64' | 'selfReportedMmr'> | null,
  next: SteamCheck,
): number | null {
  if (!previous || previous.steamId64 !== next.steamId64 || !mmrAllowed(next.medal)) return null
  return previous.selfReportedMmr
}

const MMR_STAR_STARTS = [
  0, 154, 308, 462, 616,
  770, 924, 1078, 1232, 1386,
  1540, 1694, 1848, 2002, 2156,
  2310, 2464, 2618, 2772, 2926,
  3080, 3234, 3388, 3542, 3696,
  3850, 4004, 4158, 4312, 4466,
  4620, 4820, 5020, 5220, 5420,
  5620,
] as const

const IMMORTAL_MMR = MMR_STAR_STARTS[35]

export const MIN_SELF_REPORTED_MMR = IMMORTAL_MMR

export type MmrRange = { from: number; to: number | null }

export function estimatedMmrRange(medal: Medal): MmrRange | null {
  switch (medal.kind) {
    case 'uncalibrated':
      return null
    case 'immortal':
      return { from: IMMORTAL_MMR, to: null }
    case 'ranked': {
      const star = (medal.tier - 1) * 5 + (medal.stars - 1)
      return { from: MMR_STAR_STARTS[star], to: MMR_STAR_STARTS[star + 1] - 1 }
    }
  }
}

export function formatMmr(mmr: number): string {
  return mmr.toLocaleString('en-US')
}

export function formatMmrRange({ from, to }: MmrRange): string {
  return to === null ? `≈ ${formatMmr(from)}+` : `≈ ${formatMmr(from)}–${formatMmr(to)}`
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

type MedalRank = 0 | RankedTier | 8

const MEDAL_TINTS: Record<MedalRank, string> = {
  0: '#24262b',
  1: '#3a3226',
  2: '#2d3a2c',
  3: '#1f3a3e',
  4: '#3d3417',
  5: '#33244a',
  6: '#1b3f35',
  7: '#1f2f52',
  8: '#4a1d22',
}

function medalRank(medal: Medal): MedalRank {
  switch (medal.kind) {
    case 'uncalibrated':
      return 0
    case 'ranked':
      return medal.tier
    case 'immortal':
      return 8
  }
}

export function medalTint(medal: Medal): string {
  return MEDAL_TINTS[medalRank(medal)]
}

export function steamId64ToAccountId(steamId64: string): number {
  return Number(BigInt(steamId64) - STEAM_ID64_BASE)
}

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
  const name = MEDAL_NAMES[medalRank(medal)]
  switch (medal.kind) {
    case 'uncalibrated':
      return name
    case 'ranked':
      return `${name} ${medal.stars}`
    case 'immortal':
      return medal.leaderboardRank === null ? name : `${name} #${medal.leaderboardRank}`
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

export function regionShare(region: PublicRegion): string {
  return `${region.name}, ${region.percent}%`
}

export function regionLabel(region: PublicRegion): string {
  return `most ranked games in ${regionShare(region)}`
}

export function normalizeRedditUsername(name: string): string {
  return name.trim().toLowerCase()
}
