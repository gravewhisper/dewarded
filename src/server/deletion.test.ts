import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Medal, SteamCheck, SteamKey } from '#/domain'
import type { Person } from './db.ts'

const DB_PATH = join(mkdtempSync(join(tmpdir(), 'dewarded-deletion-')), 'test.db')
process.env.DATABASE_URL = `file:${DB_PATH}`
const db = await import('./db.ts')
const { deleteIfConfirmed } = await import('./deletion.ts')

const check = (steamKey: SteamKey): SteamCheck => ({
  steamKey,
  medal: { kind: 'ranked', tier: 3, stars: 2 },
  region: null,
  checkedAt: new Date(0),
  regionCheckedAt: new Date(0),
})

const STEAM_KEY = '3'.repeat(64) as SteamKey

function form(fields: Record<string, string>): FormData {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) body.set(key, value)
  return body
}

function whoseData() {
  const lookup = {
    asked: 0,
    person: async (): Promise<Person> => {
      lookup.asked++
      return { steamKey: STEAM_KEY }
    },
  }
  return lookup
}

test('a delete request without the confirmation tick deletes nothing and never works out whose data it is', async () => {
  await db.saveClaim(check(STEAM_KEY), 'keep_me')
  const lookup = whoseData()
  for (const body of [form({}), form({ confirm: 'on' })]) {
    assert.equal(await deleteIfConfirmed(body, lookup.person), 'delete_unconfirmed')
    assert.notEqual(await db.getClaimBySteamKey(STEAM_KEY), null)
  }
  assert.equal(lookup.asked, 0)
})

test('a delete request with the confirmation tick deletes the claim', async () => {
  await db.saveClaim(check(STEAM_KEY), 'keep_me')
  const lookup = whoseData()
  assert.equal(await deleteIfConfirmed(form({ confirm: 'yes' }), lookup.person), 'deleted')
  assert.equal(await db.getClaimBySteamKey(STEAM_KEY), null)
  assert.equal(lookup.asked, 1)
})

test('a deleted claim leaves none of its bytes in the database file', async () => {
  const steamKey = '5'.repeat(64) as SteamKey
  const medal: Medal = { kind: 'immortal', leaderboardRank: 4321 }
  const traces = ['erase_me_entirely', JSON.stringify(medal), steamKey]
  await db.saveClaim({ ...check(steamKey), medal }, 'erase_me_entirely')
  assert.deepEqual(traces.filter((trace) => readFileSync(DB_PATH).includes(trace)), traces)
  assert.equal(await deleteIfConfirmed(form({ confirm: 'yes' }), async () => ({ steamKey })), 'deleted')
  assert.deepEqual(traces.filter((trace) => readFileSync(DB_PATH).includes(trace)), [])
})
