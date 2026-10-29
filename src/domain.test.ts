import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  medalArt,
  medalLabel,
  medalTint,
  carriedMmr,
  claimIdFromBytes,
  parseClaimId,
  parseRedditUsername,
  parseVerifyMode,
  publicClaim,
  type ClaimId,
  estimatedMmrRange,
  formatMmrRange,
  mmrAllowed,
  parseMmrInput,
  type MedalCheck,
  parseMedal,
  pickRegion,
  publicVerification,
  regionLabel,
  regionShare,
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
    selfReportedMmr: 9000,
  })
  assert.deepEqual(Object.keys(shown).sort(), [
    'checkedAt',
    'medal',
    'redditUsername',
    'region',
    'selfReportedMmr',
  ])
  assert.doesNotMatch(JSON.stringify(shown), /76561198065514372|105248644/)
})

test('each medal tier has its own card tint', () => {
  assert.equal(medalTint({ kind: 'uncalibrated' }), '#24262b')
  const ranked = ([1, 2, 3, 4, 5, 6, 7] as const).map((tier) =>
    medalTint({ kind: 'ranked', tier, stars: 1 }),
  )
  assert.deepEqual(ranked, ['#3a3226', '#2d3a2c', '#1f3a3e', '#3d3417', '#33244a', '#1b3f35', '#1f2f52'])
  assert.equal(medalTint({ kind: 'ranked', tier: 6, stars: 5 }), '#1b3f35')
  assert.equal(medalTint({ kind: 'immortal', leaderboardRank: 16 }), '#4a1d22')
  assert.equal(medalTint({ kind: 'immortal', leaderboardRank: null }), '#4a1d22')
})

test('short region shows the name and share', () => {
  assert.equal(regionShare({ name: 'Europe', games: 91, share: 0.914 }), 'Europe, 91%')
})

const immortalCheck: MedalCheck = {
  redditUsername: 'someone',
  steamId64: '76561198065514372',
  accountId: 105248644,
  medal: { kind: 'immortal', leaderboardRank: 16 },
  region: null,
  checkedAt: new Date(0),
}

test('each star estimates MMR from its start to just before the next star', () => {
  assert.deepEqual(estimatedMmrRange({ kind: 'ranked', tier: 6, stars: 1 }), { from: 3850, to: 4003 })
  assert.deepEqual(estimatedMmrRange({ kind: 'ranked', tier: 1, stars: 1 }), { from: 0, to: 153 })
  assert.deepEqual(estimatedMmrRange({ kind: 'ranked', tier: 5, stars: 5 }), { from: 3696, to: 3849 })
  assert.deepEqual(estimatedMmrRange({ kind: 'ranked', tier: 7, stars: 1 }), { from: 4620, to: 4819 })
  assert.deepEqual(estimatedMmrRange({ kind: 'ranked', tier: 7, stars: 5 }), { from: 5420, to: 5619 })
})

test('Immortal estimate is open-ended and uncalibrated has none', () => {
  assert.deepEqual(estimatedMmrRange({ kind: 'immortal', leaderboardRank: 16 }), { from: 5620, to: null })
  assert.equal(estimatedMmrRange({ kind: 'uncalibrated' }), null)
})

test('MMR ranges read as approximate', () => {
  assert.equal(formatMmrRange({ from: 4312, to: 4465 }), '≈ 4,312–4,465')
  assert.equal(formatMmrRange({ from: 5620, to: null }), '≈ 5,620+')
})

test('a recheck of the same Steam account keeps the self-reported MMR', () => {
  assert.equal(carriedMmr({ steamId64: immortalCheck.steamId64, selfReportedMmr: 9200 }, immortalCheck), 9200)
})

test('linking a different Steam account clears the self-reported MMR', () => {
  assert.equal(carriedMmr({ steamId64: '76561198000000001', selfReportedMmr: 9200 }, immortalCheck), null)
})

test('a recheck that drops below Immortal clears the self-reported MMR', () => {
  const legend: MedalCheck = { ...immortalCheck, medal: { kind: 'ranked', tier: 5, stars: 3 } }
  assert.equal(carriedMmr({ steamId64: immortalCheck.steamId64, selfReportedMmr: 9200 }, legend), null)
  assert.equal(carriedMmr({ steamId64: immortalCheck.steamId64, selfReportedMmr: 9200 }, { ...immortalCheck, medal: { kind: 'uncalibrated' } }), null)
})

test('a first link has no self-reported MMR', () => {
  assert.equal(carriedMmr(null, immortalCheck), null)
})

test('only Immortal medals can carry a self-reported MMR', () => {
  assert.equal(mmrAllowed({ kind: 'immortal', leaderboardRank: null }), true)
  assert.equal(mmrAllowed({ kind: 'ranked', tier: 7, stars: 5 }), false)
  assert.equal(mmrAllowed({ kind: 'uncalibrated' }), false)
})

test('MMR input accepts whole numbers from the Immortal floor of 5620 to 20000', () => {
  assert.deepEqual(parseMmrInput('5620'), { ok: true, mmr: 5620 })
  assert.deepEqual(parseMmrInput(' 9200 '), { ok: true, mmr: 9200 })
  assert.deepEqual(parseMmrInput('20000'), { ok: true, mmr: 20000 })
})

test('MMR input below the Immortal floor is rejected', () => {
  assert.deepEqual(parseMmrInput('5619'), { ok: false })
  assert.deepEqual(parseMmrInput('3000'), { ok: false })
  assert.deepEqual(parseMmrInput('0'), { ok: false })
})

test('empty MMR input clears it', () => {
  assert.deepEqual(parseMmrInput(''), { ok: true, mmr: null })
  assert.deepEqual(parseMmrInput('  '), { ok: true, mmr: null })
})

test('MMR input rejects non-integers and out-of-range values', () => {
  for (const raw of ['abc', '20001', '25000', '-1', '4.5', '1e3', '4,250']) {
    assert.deepEqual(parseMmrInput(raw), { ok: false }, raw)
  }
})

test('star estimates tile from Herald 1 up to Immortal with no gaps or overlaps', () => {
  let next = 0
  for (const tier of [1, 2, 3, 4, 5, 6, 7] as const) {
    for (const stars of [1, 2, 3, 4, 5] as const) {
      const range = estimatedMmrRange({ kind: 'ranked', tier, stars })!
      assert.equal(range.from, next, `tier ${tier} star ${stars}`)
      assert.ok(range.to! > range.from)
      next = range.to! + 1
    }
  }
  assert.equal(estimatedMmrRange({ kind: 'immortal', leaderboardRank: null })!.from, next)
})

test('claim ids are 10 lowercase base32 characters', () => {
  const id = claimIdFromBytes(crypto.getRandomValues(new Uint8Array(10)))
  assert.match(id, /^[a-z2-7]{10}$/)
  assert.equal(claimIdFromBytes(new Uint8Array(10)), 'aaaaaaaaaa')
  assert.equal(claimIdFromBytes(Uint8Array.from([0, 1, 25, 26, 31, 32, 63, 255, 224, 7])), 'abz27a77ah')
})

test('claim ids from different random bytes differ', () => {
  const ids = new Set(Array.from({ length: 1000 }, () => claimIdFromBytes(crypto.getRandomValues(new Uint8Array(10)))))
  assert.equal(ids.size, 1000)
})

test('claim id parsing accepts only the slug format', () => {
  assert.equal(parseClaimId('k3x7q2mwab'), 'k3x7q2mwab')
  for (const bad of ['', 'k3x9q2mwa', 'k3x7q2mwabc', 'K3X9Q2MWAB', 'k3x9q2mw01', '../etc/pw', '76561198065514372']) {
    assert.equal(parseClaimId(bad), null, bad)
  }
})

test('claimed Reddit names are 3 to 20 letters, digits, underscores or hyphens', () => {
  assert.equal(parseRedditUsername('Some_User-1'), 'some_user-1')
  assert.equal(parseRedditUsername('  abc  '), 'abc')
  assert.equal(parseRedditUsername('a'.repeat(20)), 'a'.repeat(20))
  for (const bad of ['', 'ab', 'a'.repeat(21), 'has space', 'dot.name', 'emoji😀x', '<script>', 'name/x']) {
    assert.equal(parseRedditUsername(bad), null, bad)
  }
})

test('claimed Reddit names may be typed with a u/ prefix', () => {
  assert.equal(parseRedditUsername('u/Gaben'), 'gaben')
  assert.equal(parseRedditUsername('/u/Gaben'), 'gaben')
  assert.equal(parseRedditUsername('u/'), null)
})

test('verify mode defaults to reddit only when Reddit credentials exist', () => {
  assert.equal(parseVerifyMode(undefined, true), 'reddit')
  assert.equal(parseVerifyMode(undefined, false), 'backlink')
  assert.equal(parseVerifyMode('', true), 'reddit')
  assert.equal(parseVerifyMode('', false), 'backlink')
})

test('an explicit verify mode wins over the default', () => {
  assert.equal(parseVerifyMode('backlink', true), 'backlink')
  assert.equal(parseVerifyMode('reddit', false), 'reddit')
})

test('an unknown verify mode is a startup error', () => {
  assert.throws(() => parseVerifyMode('Backlink', false), /VERIFY_MODE/)
  assert.throws(() => parseVerifyMode('both', true), /VERIFY_MODE/)
})

test('public claim carries no Steam identifiers', () => {
  const shown = publicClaim({
    id: 'k3x7q2mwab' as ClaimId,
    claimedRedditUsername: 'someone',
    steamId64: '76561198065514372',
    accountId: 105248644,
    medal: { kind: 'immortal', leaderboardRank: 4151 },
    region: { name: 'Europe', games: 10, share: 1 },
    checkedAt: new Date(0),
    selfReportedMmr: 9000,
  })
  assert.deepEqual(Object.keys(shown).sort(), [
    'checkedAt',
    'claimedRedditUsername',
    'id',
    'medal',
    'region',
    'selfReportedMmr',
  ])
  assert.doesNotMatch(JSON.stringify(shown), /76561198065514372|105248644/)
})
