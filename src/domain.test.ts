import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  medalArt,
  medalLabel,
  parseMedal,
  pickRegion,
  publicVerification,
  regionLabel,
  steamId64ToAccountId,
} from './domain.ts'

import REGION_NAMES from './server/regions.json' with { type: 'json' }

test('steamId64 converts to the 32-bit account id', () => {
  assert.equal(steamId64ToAccountId('76561198065514372'), 105248644)
})

test('rank_tier 80 with leaderboard rank is a ranked Immortal', () => {
  const medal = parseMedal(80, 16)
  assert.deepEqual(medal, { kind: 'immortal', leaderboardRank: 16 })
  assert.equal(medalLabel(medal!), 'Immortal #16')
})

test('rank_tier 80 without leaderboard rank is an unranked Immortal', () => {
  const medal = parseMedal(80, null)
  assert.deepEqual(medal, { kind: 'immortal', leaderboardRank: null })
  assert.equal(medalLabel(medal!), 'Immortal')
})

test('rank_tier 63 is Ancient 3', () => {
  const medal = parseMedal(63, null)
  assert.deepEqual(medal, { kind: 'ranked', tier: 6, stars: 3 })
  assert.equal(medalLabel(medal!), 'Ancient 3')
})

test('null or zero rank_tier is uncalibrated', () => {
  assert.deepEqual(parseMedal(null, null), { kind: 'uncalibrated' })
  assert.deepEqual(parseMedal(0, null), { kind: 'uncalibrated' })
})

test('rank_tier outside the encoding is rejected', () => {
  assert.equal(parseMedal(90, null), null)
  assert.equal(parseMedal(36, null), null)
  assert.equal(parseMedal(40, null), null)
})

test('region is the one with the most ranked games', () => {
  const counts = {
    '3': { games: 1506, win: 846 },
    '9': { games: 51, win: 30 },
    '1': { games: 1, win: 0 },
    '8': { games: 1, win: 1 },
    NaN: { games: 4, win: 2 },
  }
  const region = pickRegion(counts, REGION_NAMES)
  assert.equal(region?.name, 'Europe')
  assert.equal(region?.games, 1506)
  assert.equal(region?.share, 1506 / 1559)
  assert.equal(regionLabel(region!), 'most ranked games in Europe, 97%')
})

test('Perfect World servers count together as China', () => {
  const counts = {
    '3': { games: 100, win: 50 },
    '12': { games: 40, win: 20 },
    '13': { games: 40, win: 20 },
    '25': { games: 30, win: 15 },
  }
  const region = pickRegion(counts, REGION_NAMES)
  assert.equal(region?.name, 'China')
  assert.equal(region?.games, 110)
  assert.equal(regionLabel(region!), 'most ranked games in China, 52%')
})

test('no ranked games means no region', () => {
  assert.equal(pickRegion({}, REGION_NAMES), null)
})

test('ranked medal art is the tier icon with its star overlay', () => {
  assert.deepEqual(medalArt({ kind: 'ranked', tier: 6, stars: 3 }), {
    icon: '/medals/rank_icon_6.png',
    star: '/medals/rank_star_3.png',
    boardRank: null,
  })
})

test('uncalibrated medal art has no star', () => {
  assert.deepEqual(medalArt({ kind: 'uncalibrated' }), {
    icon: '/medals/rank_icon_0.png',
    star: null,
    boardRank: null,
  })
})

test('immortal medal art picks the leaderboard variant and shows the rank', () => {
  const art = (leaderboardRank: number | null) =>
    medalArt({ kind: 'immortal', leaderboardRank })
  assert.deepEqual(art(null), { icon: '/medals/rank_icon_8.png', star: null, boardRank: null })
  assert.deepEqual(art(10), { icon: '/medals/rank_icon_8c.png', star: null, boardRank: 10 })
  assert.deepEqual(art(11), { icon: '/medals/rank_icon_8b.png', star: null, boardRank: 11 })
  assert.deepEqual(art(100), { icon: '/medals/rank_icon_8b.png', star: null, boardRank: 100 })
  assert.deepEqual(art(101), { icon: '/medals/rank_icon_8.png', star: null, boardRank: 101 })
})

test('every medal art path points at a vendored image', async () => {
  const { existsSync } = await import('node:fs')
  const medals = [
    { kind: 'uncalibrated' as const },
    ...([1, 2, 3, 4, 5, 6, 7] as const).flatMap((tier) =>
      ([1, 2, 3, 4, 5] as const).map((stars) => ({ kind: 'ranked' as const, tier, stars })),
    ),
    ...[null, 1, 50, 5000].map((leaderboardRank) => ({ kind: 'immortal' as const, leaderboardRank })),
  ]
  for (const medal of medals) {
    const { icon, star } = medalArt(medal)
    for (const path of [icon, star]) {
      if (path) assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), path)
    }
  }
})

test('public verification carries no Steam identifiers', () => {
  const shown = publicVerification({
    redditUsername: 'someone',
    steamId64: '76561198065514372',
    accountId: 105248644,
    medal: { kind: 'immortal', leaderboardRank: 16 },
    region: null,
    checkedAt: new Date(0),
  })
  assert.deepEqual(Object.keys(shown).sort(), ['checkedAt', 'medal', 'redditUsername', 'region'])
  assert.doesNotMatch(JSON.stringify(shown), /76561198065514372|105248644/)
})
