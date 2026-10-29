import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import type { SteamId64 } from '#/domain'

const dir = mkdtempSync(join(tmpdir(), 'dewarded-migration-'))
process.env.DATABASE_URL = `file:${join(dir, 'unused.db')}`
const { openDatabase } = await import('./db.ts')
const { deriveSteamKey } = await import('./steamKey.ts')

const STEAM_ID = '76561198065514372' as SteamId64
const OTHER_STEAM_ID = '76561198000000001' as SteamId64
const PEPPER = 'ab'.repeat(32)
const IMMORTAL = JSON.stringify({ kind: 'immortal', leaderboardRank: 16 })
const LEGEND = JSON.stringify({ kind: 'ranked', tier: 5, stars: 3 })
const EUROPE = JSON.stringify({ name: 'Europe', games: 40, share: 1 })

async function writeOldSchemaDb(path: string): Promise<void> {
  const client = createClient({ url: `file:${path}` })
  await client.batch(
    [
      `CREATE TABLE verifications (
        reddit_username TEXT PRIMARY KEY,
        steam_id64 TEXT NOT NULL,
        account_id INTEGER NOT NULL,
        medal TEXT NOT NULL,
        region TEXT,
        checked_at INTEGER NOT NULL,
        self_reported_mmr INTEGER
      )`,
      `CREATE TABLE claims (
        id TEXT PRIMARY KEY,
        steam_id64 TEXT UNIQUE NOT NULL,
        account_id INTEGER NOT NULL,
        claimed_reddit_username TEXT NOT NULL,
        medal TEXT NOT NULL,
        region TEXT,
        checked_at INTEGER NOT NULL,
        self_reported_mmr INTEGER,
        region_checked_at INTEGER
      )`,
      {
        sql: 'INSERT INTO claims VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['k3x7q2mwab', STEAM_ID, 105248644, 'owner_name', IMMORTAL, EUROPE, 3000, 9200, 1000],
      },
      {
        sql: 'INSERT INTO claims VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['aaaaaaaaaa', OTHER_STEAM_ID, 39735173, 'other_name', LEGEND, null, 4000, null, null],
      },
      {
        sql: 'INSERT INTO verifications VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['reddit_owner', STEAM_ID, 105248644, IMMORTAL, EUROPE, 5000, 9300],
      },
    ],
    'write',
  )
  client.close()
}

async function columns(client: Client, table: string): Promise<unknown[]> {
  return (await client.execute(`PRAGMA table_info(${table})`)).rows.map((column) => column.name)
}

function filesOf(name: string): Buffer[] {
  return readdirSync(dir)
    .filter((file) => file.startsWith(name))
    .map((file) => readFileSync(join(dir, file)))
}

test('opening a database that stores Steam IDs stores keyed hashes instead and keeps every row', async () => {
  const path = join(dir, 'keys.db')
  await writeOldSchemaDb(path)
  const client = await openDatabase(`file:${path}`, undefined, PEPPER)
  const key = await deriveSteamKey(STEAM_ID, PEPPER)
  const otherKey = await deriveSteamKey(OTHER_STEAM_ID, PEPPER)

  assert.deepEqual(await columns(client, 'claims'), [
    'id',
    'steam_key',
    'claimed_reddit_username',
    'medal',
    'region',
    'checked_at',
    'self_reported_mmr',
    'region_checked_at',
  ])
  assert.deepEqual(await columns(client, 'verifications'), [
    'reddit_username',
    'steam_key',
    'medal',
    'region',
    'checked_at',
    'self_reported_mmr',
    'region_checked_at',
  ])
  const claims = await client.execute('SELECT * FROM claims ORDER BY id')
  assert.deepEqual(
    claims.rows.map((row) => ({ ...row })),
    [
      {
        id: 'aaaaaaaaaa',
        steam_key: otherKey,
        claimed_reddit_username: 'other_name',
        medal: LEGEND,
        region: null,
        checked_at: 4000,
        self_reported_mmr: null,
        region_checked_at: 4000,
      },
      {
        id: 'k3x7q2mwab',
        steam_key: key,
        claimed_reddit_username: 'owner_name',
        medal: IMMORTAL,
        region: EUROPE,
        checked_at: 3000,
        self_reported_mmr: 9200,
        region_checked_at: 1000,
      },
    ],
  )
  const verifications = await client.execute('SELECT * FROM verifications')
  assert.deepEqual(
    verifications.rows.map((row) => ({ ...row })),
    [
      {
        reddit_username: 'reddit_owner',
        steam_key: key,
        medal: IMMORTAL,
        region: EUROPE,
        checked_at: 5000,
        self_reported_mmr: 9300,
        region_checked_at: 5000,
      },
    ],
  )
  await assert.rejects(
    client.execute({
      sql: `INSERT INTO claims (id, steam_key, claimed_reddit_username, medal, checked_at, region_checked_at)
            VALUES ('bbbbbbbbbb', ?, 'second_page', ?, 6000, 6000)`,
      args: [key, LEGEND],
    }),
    /UNIQUE/,
  )
  client.close()
})

test('after opening, no byte of the database file holds a Steam ID', async () => {
  const path = join(dir, 'bytes.db')
  await writeOldSchemaDb(path)
  assert.equal(
    filesOf('bytes.db').some((bytes) => bytes.includes(STEAM_ID)),
    true,
    'the old file holds the Steam ID before opening',
  )
  ;(await openDatabase(`file:${path}`, undefined, PEPPER)).close()
  const files = filesOf('bytes.db')
  assert.ok(files.length > 0)
  for (const bytes of files) {
    assert.equal(bytes.includes(STEAM_ID), false)
    assert.equal(bytes.includes(OTHER_STEAM_ID), false)
    assert.equal(bytes.includes('7656119'), false)
  }
})

test('opening an already migrated database leaves the file byte for byte unchanged', async () => {
  const path = join(dir, 'twice.db')
  await writeOldSchemaDb(path)
  ;(await openDatabase(`file:${path}`, undefined, PEPPER)).close()
  const once = readFileSync(path)
  ;(await openDatabase(`file:${path}`, undefined, PEPPER)).close()
  assert.deepEqual(readFileSync(path), once)
  assert.deepEqual(readdirSync(dir).filter((file) => file.startsWith('twice.db')), ['twice.db'])
})
