import { test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SteamId64 } from '#/domain'

process.env.DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), 'dewarded-link-')), 'test.db')}`
const db = await import('./db.ts')
const { claimAccount, linkAccount, refreshAccount, refreshClaim } = await import('./link.ts')
const { steamIdentity } = await import('./steamKey.ts')

const steam = (steamId64: string) => steamIdentity(steamId64 as SteamId64)

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

type OpenDotaStub = { calls: string[]; rankTier: number; regionId: string; playerStatus: number }

function stubOpenDota(t: TestContext): OpenDotaStub {
  const stub: OpenDotaStub = { calls: [], rankTier: 53, regionId: '3', playerStatus: 200 }
  t.mock.method(console, 'error', () => {})
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input)
    stub.calls.push(url)
    if (url.endsWith('/refresh')) return new Response('{}', { status: 200 })
    if (url.includes('/counts')) {
      return new Response(JSON.stringify({ region: { [stub.regionId]: { games: 40 } } }), { status: 200 })
    }
    return new Response(
      JSON.stringify({ profile: { steamid: 'x' }, rank_tier: stub.rankTier, leaderboard_rank: null }),
      { status: stub.playerStatus },
    )
  })
  return stub
}

const day = (n: number) => new Date(Date.UTC(2030, 0, n))
const later = (start: Date, ms: number) => new Date(start.getTime() + ms)

test('linking an account checked within the hour reuses the stored medal with no OpenDota calls', async (t) => {
  const opendota = stubOpenDota(t)
  const steamId64 = '76561198000000101'
  const start = day(1)
  assert.equal((await claimAccount(await steam(steamId64), 'claimer', { now: start })).ok, true)
  assert.equal(opendota.calls.length, 3)

  opendota.calls = []
  opendota.rankTier = 61
  assert.deepEqual(await linkAccount('linker', await steam(steamId64), { now: later(start, 30 * MINUTE) }), { ok: true })
  assert.equal(opendota.calls.length, 0)
  const reused = await db.getVerification('linker')
  assert.deepEqual(reused?.medal, { kind: 'ranked', tier: 5, stars: 3 })
  assert.equal(reused?.checkedAt.getTime(), start.getTime())
})

test('linking an account last checked over an hour ago asks OpenDota again', async (t) => {
  const opendota = stubOpenDota(t)
  const steamId64 = '76561198000000102'
  const start = day(2)
  await claimAccount(await steam(steamId64), 'claimer_two', { now: start })
  opendota.calls = []
  opendota.rankTier = 61
  assert.deepEqual(await linkAccount('linker_two', await steam(steamId64), { now: later(start, HOUR) }), { ok: true })
  assert.equal(opendota.calls.length > 0, true)
  assert.deepEqual((await db.getVerification('linker_two'))?.medal, { kind: 'ranked', tier: 6, stars: 1 })
})

test('a claim deleted and made again is checked again, because deletion keeps nothing to reuse', async (t) => {
  const opendota = stubOpenDota(t)
  const steamId64 = '76561198000000103'
  const start = day(3)
  await claimAccount(await steam(steamId64), 'claimer_three', { now: start })
  await db.deletePersonData({ steamKey: (await steam(steamId64)).steamKey })
  opendota.calls = []
  assert.equal((await claimAccount(await steam(steamId64), 'claimer_three', { now: later(start, MINUTE) })).ok, true)
  assert.equal(opendota.calls.length > 0, true)
})

test('a check that would pass the per-minute budget reports busy with no calls until the minute has passed', async (t) => {
  const opendota = stubOpenDota(t)
  const start = day(10)
  const limits = { perMinute: 6, perDay: 100 }
  assert.equal((await claimAccount(await steam('76561198000000201'), 'first', { now: start, limits })).ok, true)
  assert.equal((await claimAccount(await steam('76561198000000202'), 'second', { now: start, limits })).ok, true)
  opendota.calls = []
  const blocked = await claimAccount(await steam('76561198000000203'), 'third', { now: later(start, 59 * 1000), limits })
  assert.deepEqual(blocked, { ok: false, error: 'busy' })
  assert.equal(opendota.calls.length, 0)
  const retried = await claimAccount(await steam('76561198000000203'), 'third', { now: later(start, MINUTE + 1), limits })
  assert.equal(retried.ok, true)
  assert.equal(opendota.calls.length, 3)
})

test('a check that would pass the daily budget reports busy with no calls until the day has passed', async (t) => {
  const opendota = stubOpenDota(t)
  const start = day(12)
  const limits = { perMinute: 100, perDay: 6 }
  await claimAccount(await steam('76561198000000301'), 'first', { now: start, limits })
  await claimAccount(await steam('76561198000000302'), 'second', { now: later(start, HOUR), limits })
  opendota.calls = []
  const blocked = await claimAccount(await steam('76561198000000303'), 'third', { now: later(start, 23 * HOUR), limits })
  assert.deepEqual(blocked, { ok: false, error: 'busy' })
  assert.equal(opendota.calls.length, 0)
  const retried = await claimAccount(await steam('76561198000000303'), 'third', { now: later(start, 24 * HOUR + 1), limits })
  assert.equal(retried.ok, true)
  assert.equal(opendota.calls.length, 3)
})

test('thirty claims at once never make more OpenDota calls than the per-minute budget', async (t) => {
  const opendota = stubOpenDota(t)
  const now = day(14)
  const limits = { perMinute: 10, perDay: 1000 }
  const steams = await Promise.all(
    Array.from({ length: 30 }, (_, i) => steam(`765611980000004${String(i).padStart(2, '0')}`)),
  )
  const results = await Promise.all(
    steams.map((account, i) => claimAccount(account, `burst_${i}`, { now, limits })),
  )
  const granted = results.filter((result) => result.ok).length
  const busy = results.filter((result) => !result.ok && result.error === 'busy').length
  t.diagnostic(`granted ${granted}, busy ${busy}, fetch calls ${opendota.calls.length}`)
  assert.equal(granted, 3)
  assert.equal(busy, 27)
  assert.equal(opendota.calls.length, granted * 3)
})

const countsCalls = (opendota: OpenDotaStub) => opendota.calls.filter((url) => url.includes('/counts'))

test('a refresh within a day of the last region lookup keeps the stored region and makes two calls', async (t) => {
  const opendota = stubOpenDota(t)
  const steamId64 = '76561198000000501'
  const start = day(16)
  await claimAccount(await steam(steamId64), 'region_keeper', { now: start })
  assert.equal(countsCalls(opendota).length, 1)

  opendota.calls = []
  opendota.regionId = '2'
  assert.equal((await refreshClaim(await steam(steamId64), { now: later(start, 2 * HOUR) })).ok, true)
  assert.equal(opendota.calls.length, 2)
  assert.equal(countsCalls(opendota).length, 0)
  assert.equal((await db.getClaimBySteamKey((await steam(steamId64)).steamKey))?.region?.name, 'Europe')
})

test('a refresh a day after the last region lookup fetches the region again, even after medal-only refreshes', async (t) => {
  const opendota = stubOpenDota(t)
  const steamId64 = '76561198000000502'
  const start = day(18)
  await claimAccount(await steam(steamId64), 'region_mover', { now: start })
  await refreshClaim(await steam(steamId64), { now: later(start, 12 * HOUR) })
  opendota.calls = []
  opendota.regionId = '2'
  assert.equal((await refreshClaim(await steam(steamId64), { now: later(start, 24 * HOUR) })).ok, true)
  assert.equal(opendota.calls.length, 3)
  assert.equal(countsCalls(opendota).length, 1)
  assert.equal((await db.getClaimBySteamKey((await steam(steamId64)).steamKey))?.region?.name, 'US East')
})

test('after OpenDota answers 429, checks report rate_limited with no calls for a minute', async (t) => {
  const opendota = stubOpenDota(t)
  const start = day(20)
  opendota.playerStatus = 429
  assert.deepEqual(await claimAccount(await steam('76561198000000601'), 'limited', { now: start }), {
    ok: false,
    error: 'rate_limited',
  })

  opendota.calls = []
  opendota.playerStatus = 200
  const paused = await claimAccount(await steam('76561198000000602'), 'waiting', { now: later(start, 59 * 1000) })
  assert.deepEqual(paused, { ok: false, error: 'rate_limited' })
  assert.equal(opendota.calls.length, 0)

  const resumed = await claimAccount(await steam('76561198000000602'), 'waiting', { now: later(start, MINUTE) })
  assert.equal(resumed.ok, true)
  assert.equal(opendota.calls.length, 3)
})

const askedOnlyAbout = (opendota: OpenDotaStub, accountId: string) =>
  opendota.calls.length > 0 && opendota.calls.every((url) => new RegExp(`/players/${accountId}(/|$)`).test(url))

test('refreshing a page asks OpenDota about the Steam account that is signed in', async (t) => {
  const opendota = stubOpenDota(t)
  const start = day(22)
  const owner = await steam('76561198000000123')
  await claimAccount(owner, 'owner_name', { now: start })
  opendota.calls = []
  assert.equal((await refreshClaim(owner, { now: later(start, 2 * HOUR) })).ok, true)
  assert.equal(askedOnlyAbout(opendota, '39734395'), true, opendota.calls.join(' '))
})

test('signing in again with the same Steam account finds the same page', async (t) => {
  const opendota = stubOpenDota(t)
  const start = day(24)
  const page = await claimAccount(await steam('76561198000000701'), 'first_name', { now: start })
  assert.equal(page.ok, true)
  opendota.calls = []
  const signedInAgain = await steam('76561198000000701')
  assert.deepEqual(await claimAccount(signedInAgain, 'second_name', { now: later(start, 2 * HOUR) }), page)
  assert.equal(opendota.calls.length, 0)
  assert.equal((await db.getClaimBySteamKey(signedInAgain.steamKey))?.claimedRedditUsername, 'second_name')
})

test("another Steam account's session can't refresh, rename or delete someone else's page", async (t) => {
  const opendota = stubOpenDota(t)
  const start = day(26)
  const owner = await steam('76561198000000801')
  const other = await steam('76561198000000802')
  const page = await claimAccount(owner, 'owner_name', { now: start })
  assert.ok(page.ok)
  opendota.calls = []
  assert.deepEqual(await refreshClaim(other, { now: later(start, 2 * HOUR) }), { ok: false, error: 'not_linked' })
  assert.equal(opendota.calls.length, 0)
  const otherPage = await claimAccount(other, 'hijacked', { now: later(start, 2 * HOUR) })
  assert.ok(otherPage.ok)
  assert.notEqual(otherPage.id, page.id)
  await db.deletePersonData({ steamKey: other.steamKey })
  assert.equal((await db.getClaim(page.id))?.claimedRedditUsername, 'owner_name')
  assert.equal(await db.getClaim(otherPage.id), null)
})

test('a reddit-mode refresh needs a Steam sign-in for the linked account in this session', async (t) => {
  const opendota = stubOpenDota(t)
  const start = day(28)
  const owner = await steam('76561198000000901')
  await linkAccount('reddit_owner', owner, { now: start })
  opendota.calls = []
  const after = { now: later(start, 2 * HOUR) }
  assert.deepEqual(await refreshAccount('reddit_owner', null, after), { ok: false, error: 'steam_again' })
  assert.deepEqual(await refreshAccount('reddit_owner', await steam('76561198000000902'), after), {
    ok: false,
    error: 'steam_again',
  })
  assert.equal(opendota.calls.length, 0)
  assert.deepEqual(await refreshAccount('reddit_owner', owner, after), { ok: true })
  assert.equal(askedOnlyAbout(opendota, '39735173'), true, opendota.calls.join(' '))
})
