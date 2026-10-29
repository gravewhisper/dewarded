import { test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), 'dewarded-link-')), 'test.db')}`
const db = await import('./db.ts')
const { claimAccount, linkAccount } = await import('./link.ts')

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

type OpenDotaStub = { calls: string[]; rankTier: number }

function stubOpenDota(t: TestContext): OpenDotaStub {
  const stub: OpenDotaStub = { calls: [], rankTier: 53 }
  t.mock.method(console, 'error', () => {})
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input)
    stub.calls.push(url)
    if (url.endsWith('/refresh')) return new Response('{}', { status: 200 })
    if (url.includes('/counts')) {
      return new Response(JSON.stringify({ region: { '3': { games: 40 } } }), { status: 200 })
    }
    return new Response(
      JSON.stringify({ profile: { steamid: 'x' }, rank_tier: stub.rankTier, leaderboard_rank: null }),
      { status: 200 },
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
  assert.equal((await claimAccount(steamId64, 'claimer', { now: start })).ok, true)
  assert.equal(opendota.calls.length, 3)

  opendota.calls = []
  opendota.rankTier = 61
  assert.deepEqual(await linkAccount('linker', steamId64, { now: later(start, 30 * MINUTE) }), { ok: true })
  assert.equal(opendota.calls.length, 0)
  const reused = await db.getVerification('linker')
  assert.deepEqual(reused?.medal, { kind: 'ranked', tier: 5, stars: 3 })
  assert.equal(reused?.checkedAt.getTime(), start.getTime())
})

test('linking an account last checked over an hour ago asks OpenDota again', async (t) => {
  const opendota = stubOpenDota(t)
  const steamId64 = '76561198000000102'
  const start = day(2)
  await claimAccount(steamId64, 'claimer_two', { now: start })
  opendota.calls = []
  opendota.rankTier = 61
  assert.deepEqual(await linkAccount('linker_two', steamId64, { now: later(start, HOUR) }), { ok: true })
  assert.equal(opendota.calls.length > 0, true)
  assert.deepEqual((await db.getVerification('linker_two'))?.medal, { kind: 'ranked', tier: 6, stars: 1 })
})

test('a claim deleted and made again is checked again, because deletion keeps nothing to reuse', async (t) => {
  const opendota = stubOpenDota(t)
  const steamId64 = '76561198000000103'
  const start = day(3)
  await claimAccount(steamId64, 'claimer_three', { now: start })
  await db.deletePersonData({ steamId64 })
  opendota.calls = []
  assert.equal((await claimAccount(steamId64, 'claimer_three', { now: later(start, MINUTE) })).ok, true)
  assert.equal(opendota.calls.length > 0, true)
})
