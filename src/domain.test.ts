import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  medalLabel,
  parseMedal,
  pickRegion,
  regionLabel,
  steamId64ToAccountId,
} from './domain.ts'

const REGION_NAMES = { '1': 'US WEST', '3': 'EUROPE', '8': 'STOCKHOLM', '9': 'AUSTRIA' }

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
  assert.equal(region?.name, 'EUROPE')
  assert.equal(region?.games, 1506)
  assert.equal(region?.share, 1506 / 1559)
  assert.equal(regionLabel(region!), 'most ranked games in Europe, 97%')
})

test('no ranked games means no region', () => {
  assert.equal(pickRegion({}, REGION_NAMES), null)
})
