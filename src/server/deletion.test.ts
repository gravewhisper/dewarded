import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import type { Medal, SteamCheck, SteamKey } from '#/domain'
import type { Person } from './db.ts'

const DB_PATH = join(mkdtempSync(join(tmpdir(), 'dewarded-deletion-')), 'test.db')
process.env.DATABASE_URL = `file:${DB_PATH}`
const db = await import('./db.ts')
const { deleteIfConfirmed } = await import('./deletion.ts')
const { claimImage } = await import('./claimImage.tsx')
const IMAGE_DIR = join(dirname(DB_PATH), 'og')

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

test('a page loses its link-preview images when it changes and when it is deleted', async () => {
  const steamKey = '7'.repeat(64) as SteamKey
  const id = await db.saveClaim(check(steamKey), 'pictured_name')
  const images = () => readdirSync(IMAGE_DIR).filter((file) => file.startsWith(id))
  const first = await claimImage(id)
  assert.ok(first && first !== 'busy')
  assert.deepEqual(images(), [`${id}-${first.version}.png`])
  await db.renameClaim(steamKey, 'renamed_name')
  assert.deepEqual(images(), [])
  await claimImage(id)
  assert.equal(images().length, 1)
  assert.equal(await deleteIfConfirmed(form({ confirm: 'yes' }), async () => ({ steamKey })), 'deleted')
  assert.deepEqual(images(), [])
  assert.equal(await claimImage(id), null)
})

const databaseFiles = () =>
  readdirSync(dirname(DB_PATH))
    .filter((file) => file.startsWith(basename(DB_PATH)))
    .map((file) => readFileSync(join(dirname(DB_PATH), file)))

test('in WAL mode, a deleted claim leaves none of its bytes in any file of the database', async () => {
  const walMode = await (await db.getDb()).execute('PRAGMA journal_mode = WAL')
  assert.equal(walMode.rows[0]?.journal_mode, 'wal')
  const steamKey = '6'.repeat(64) as SteamKey
  const medal: Medal = { kind: 'immortal', leaderboardRank: 8765 }
  const id = await db.saveClaim({ ...check(steamKey), medal }, 'erase_me_from_wal')
  const traces = ['erase_me_from_wal', id, JSON.stringify(medal), steamKey]
  const tracesLeft = () => traces.filter((trace) => databaseFiles().some((bytes) => bytes.includes(trace)))
  assert.deepEqual(tracesLeft(), traces)
  assert.equal(await deleteIfConfirmed(form({ confirm: 'yes' }), async () => ({ steamKey })), 'deleted')
  assert.deepEqual(tracesLeft(), [])
})
