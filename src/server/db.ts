import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient, type Client, type Row, type Transaction, type Value } from '@libsql/client'
import { randomBytes } from 'node:crypto'
import {
  CLAIM_ID_LENGTH,
  carriedMmr,
  claimIdFromBytes,
  mmrAllowed,
  parseSteamId64,
  type Claim,
  type ClaimId,
  type MedalCheck,
  type Medal,
  type Region,
  type SteamCheck,
  type SteamKey,
  type Verification,
} from '#/domain'
import { config } from './config'
import { deriveSteamKey } from './steamKey'

type KeyedTable = { name: string; columns: string; ownColumns: string[] }

const KEYED_TABLES: KeyedTable[] = [
  {
    name: 'verifications',
    columns: `(
      reddit_username TEXT PRIMARY KEY,
      steam_key TEXT NOT NULL,
      medal TEXT NOT NULL,
      region TEXT,
      checked_at INTEGER NOT NULL,
      self_reported_mmr INTEGER,
      region_checked_at INTEGER NOT NULL
    )`,
    ownColumns: ['reddit_username'],
  },
  {
    name: 'claims',
    columns: `(
      id TEXT PRIMARY KEY,
      steam_key TEXT UNIQUE NOT NULL,
      claimed_reddit_username TEXT NOT NULL,
      medal TEXT NOT NULL,
      region TEXT,
      checked_at INTEGER NOT NULL,
      self_reported_mmr INTEGER,
      region_checked_at INTEGER NOT NULL
    )`,
    ownColumns: ['id', 'claimed_reddit_username'],
  },
]

async function hasSteamIdColumn(tx: Transaction, table: string): Promise<boolean> {
  const { rows } = await tx.execute(`PRAGMA table_info(${table})`)
  return rows.some((column) => column.name === 'steam_id64')
}

async function keyedRow(table: KeyedTable, row: Row, pepper: string): Promise<Record<string, Value>> {
  const steamId64 = parseSteamId64(String(row.steam_id64))
  if (!steamId64) throw new Error(`${table.name} has a row whose steam_id64 is not a Steam ID`)
  return {
    steam_key: await deriveSteamKey(steamId64, pepper),
    ...Object.fromEntries(table.ownColumns.map((column) => [column, row[column]])),
    medal: row.medal,
    region: row.region,
    checked_at: row.checked_at,
    self_reported_mmr: row.self_reported_mmr ?? null,
    region_checked_at: row.region_checked_at ?? row.checked_at,
  }
}

async function replaceSteamIdsWithKeys(client: Client, pepper: string): Promise<boolean> {
  const tx = await client.transaction('write')
  try {
    const pending: KeyedTable[] = []
    for (const table of KEYED_TABLES) {
      if (await hasSteamIdColumn(tx, table.name)) pending.push(table)
    }
    if (pending.length === 0) return false
    await tx.execute('PRAGMA secure_delete = ON')
    for (const table of pending) {
      const keyed = `${table.name}_keyed`
      await tx.execute(`CREATE TABLE ${keyed} ${table.columns}`)
      const { rows } = await tx.execute(`SELECT * FROM ${table.name}`)
      for (const row of rows) {
        const values = await keyedRow(table, row, pepper)
        const columns = Object.keys(values)
        await tx.execute({
          sql: `INSERT INTO ${keyed} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          args: Object.values(values),
        })
      }
      await tx.execute(`DROP TABLE ${table.name}`)
      await tx.execute(`ALTER TABLE ${keyed} RENAME TO ${table.name}`)
    }
    await tx.commit()
    return true
  } finally {
    tx.close()
  }
}

export async function openDatabase(url: string, authToken: string | undefined, pepper: string): Promise<Client> {
  const localFile = url.startsWith('file:')
  if (localFile) mkdirSync(dirname(url.slice('file:'.length)), { recursive: true })
  const client = createClient({ url, authToken })
  for (const table of KEYED_TABLES) {
    await client.execute(`CREATE TABLE IF NOT EXISTS ${table.name} ${table.columns}`)
  }
  if ((await replaceSteamIdsWithKeys(client, pepper)) && localFile) await client.execute('VACUUM')
  await client.execute(
    'CREATE TABLE IF NOT EXISTS opendota_calls (at INTEGER NOT NULL, calls INTEGER NOT NULL)',
  )
  await client.execute('CREATE INDEX IF NOT EXISTS opendota_calls_at ON opendota_calls (at)')
  await client.execute(
    'CREATE TABLE IF NOT EXISTS opendota_pause (id INTEGER PRIMARY KEY CHECK (id = 1), until INTEGER NOT NULL)',
  )
  return client
}

let clientPromise: Promise<Client> | null = null

function getDb(): Promise<Client> {
  clientPromise ??= openDatabase(config.databaseUrl, config.databaseAuthToken, config.steamIdPepper)
  return clientPromise
}

function toSteamCheck(row: Row): SteamCheck {
  return {
    steamKey: String(row.steam_key) as SteamKey,
    medal: JSON.parse(String(row.medal)) as Medal,
    region: row.region === null ? null : (JSON.parse(String(row.region)) as Region),
    regionCheckedAt: new Date(Number(row.region_checked_at)),
    checkedAt: new Date(Number(row.checked_at)),
  }
}

function selfReportedMmr(row: Row): number | null {
  return row.self_reported_mmr === null ? null : Number(row.self_reported_mmr)
}

function toVerification(row: Row): Verification {
  return { ...toSteamCheck(row), selfReportedMmr: selfReportedMmr(row), redditUsername: String(row.reddit_username) }
}

function toClaim(row: Row): Claim {
  return {
    ...toSteamCheck(row),
    selfReportedMmr: selfReportedMmr(row),
    id: String(row.id) as ClaimId,
    claimedRedditUsername: String(row.claimed_reddit_username),
  }
}

async function readVerification(
  db: Client | Transaction,
  redditUsername: string,
): Promise<Verification | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM verifications WHERE reddit_username = ?',
    args: [redditUsername],
  })
  return rows[0] ? toVerification(rows[0]) : null
}

let lastWrite: Promise<unknown> = Promise.resolve()

function inWriteTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  const write = lastWrite.then(async () => {
    const tx = await (await getDb()).transaction('write')
    try {
      const result = await work(tx)
      await tx.commit()
      return result
    } finally {
      tx.close()
    }
  })
  lastWrite = write.catch(() => {})
  return write
}

export async function getVerification(redditUsername: string): Promise<Verification | null> {
  return readVerification(await getDb(), redditUsername)
}

export function saveVerification(check: MedalCheck): Promise<void> {
  return inWriteTransaction(async (tx) => {
    const previous = await readVerification(tx, check.redditUsername)
    await tx.execute({
      sql: `INSERT INTO verifications (reddit_username, steam_key, medal, region, checked_at, self_reported_mmr, region_checked_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (reddit_username) DO UPDATE SET
              steam_key = excluded.steam_key,
              medal = excluded.medal,
              region = excluded.region,
              checked_at = excluded.checked_at,
              self_reported_mmr = excluded.self_reported_mmr,
              region_checked_at = excluded.region_checked_at`,
      args: [
        check.redditUsername,
        check.steamKey,
        JSON.stringify(check.medal),
        check.region === null ? null : JSON.stringify(check.region),
        check.checkedAt.getTime(),
        carriedMmr(previous, check),
        check.regionCheckedAt.getTime(),
      ],
    })
  })
}

export type MmrSaveResult = 'saved' | 'not_linked' | 'mmr_not_immortal'

export function setSelfReportedMmr(
  redditUsername: string,
  mmr: number | null,
): Promise<MmrSaveResult> {
  return inWriteTransaction(async (tx) => {
    const current = await readVerification(tx, redditUsername)
    if (!current) return 'not_linked'
    if (!mmrAllowed(current.medal)) return 'mmr_not_immortal'
    await tx.execute({
      sql: 'UPDATE verifications SET self_reported_mmr = ? WHERE reddit_username = ?',
      args: [mmr, redditUsername],
    })
    return 'saved'
  })
}

export function deleteVerification(redditUsername: string): Promise<void> {
  return inWriteTransaction(async (tx) => {
    await tx.execute({
      sql: 'DELETE FROM verifications WHERE reddit_username = ?',
      args: [redditUsername],
    })
  })
}

async function readClaim(db: Client | Transaction, steamKey: SteamKey): Promise<Claim | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM claims WHERE steam_key = ?',
    args: [steamKey],
  })
  return rows[0] ? toClaim(rows[0]) : null
}

export async function getLatestSteamCheck(steamKey: SteamKey): Promise<SteamCheck | null> {
  const { rows } = await (await getDb()).execute({
    sql: `SELECT steam_key, medal, region, region_checked_at, checked_at FROM claims WHERE steam_key = ?
          UNION ALL
          SELECT steam_key, medal, region, region_checked_at, checked_at FROM verifications WHERE steam_key = ?
          ORDER BY checked_at DESC LIMIT 1`,
    args: [steamKey, steamKey],
  })
  return rows[0] ? toSteamCheck(rows[0]) : null
}

export async function getClaimBySteamKey(steamKey: SteamKey): Promise<Claim | null> {
  return readClaim(await getDb(), steamKey)
}

export async function getClaim(id: ClaimId): Promise<Claim | null> {
  const { rows } = await (await getDb()).execute({
    sql: 'SELECT * FROM claims WHERE id = ?',
    args: [id],
  })
  return rows[0] ? toClaim(rows[0]) : null
}

export function saveClaim(check: SteamCheck, claimedRedditUsername: string): Promise<ClaimId> {
  return inWriteTransaction(async (tx) => {
    const previous = await readClaim(tx, check.steamKey)
    const id = previous?.id ?? claimIdFromBytes(randomBytes(CLAIM_ID_LENGTH))
    await tx.execute({
      sql: `INSERT INTO claims (id, steam_key, claimed_reddit_username, medal, region, checked_at, self_reported_mmr, region_checked_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (steam_key) DO UPDATE SET
              claimed_reddit_username = excluded.claimed_reddit_username,
              medal = excluded.medal,
              region = excluded.region,
              checked_at = excluded.checked_at,
              self_reported_mmr = excluded.self_reported_mmr,
              region_checked_at = excluded.region_checked_at`,
      args: [
        id,
        check.steamKey,
        claimedRedditUsername,
        JSON.stringify(check.medal),
        check.region === null ? null : JSON.stringify(check.region),
        check.checkedAt.getTime(),
        carriedMmr(previous, check),
        check.regionCheckedAt.getTime(),
      ],
    })
    return id
  })
}

export function renameClaim(steamKey: SteamKey, claimedRedditUsername: string): Promise<boolean> {
  return inWriteTransaction(async (tx) => {
    const { rowsAffected } = await tx.execute({
      sql: 'UPDATE claims SET claimed_reddit_username = ? WHERE steam_key = ?',
      args: [claimedRedditUsername, steamKey],
    })
    return rowsAffected > 0
  })
}

export function setClaimMmr(steamKey: SteamKey, mmr: number | null): Promise<MmrSaveResult> {
  return inWriteTransaction(async (tx) => {
    const current = await readClaim(tx, steamKey)
    if (!current) return 'not_linked'
    if (!mmrAllowed(current.medal)) return 'mmr_not_immortal'
    await tx.execute({
      sql: 'UPDATE claims SET self_reported_mmr = ? WHERE steam_key = ?',
      args: [mmr, steamKey],
    })
    return 'saved'
  })
}

export type Person = { steamKey: SteamKey } | { redditUsername: string }

export function deletePersonData(person: Person): Promise<void> {
  return inWriteTransaction(async (tx) => {
    const steamKey =
      'steamKey' in person
        ? person.steamKey
        : (await readVerification(tx, person.redditUsername))?.steamKey
    if ('redditUsername' in person) {
      await tx.execute({
        sql: 'DELETE FROM verifications WHERE reddit_username = ?',
        args: [person.redditUsername],
      })
    }
    if (steamKey === undefined) return
    await tx.execute({ sql: 'DELETE FROM verifications WHERE steam_key = ?', args: [steamKey] })
    await tx.execute({ sql: 'DELETE FROM claims WHERE steam_key = ?', args: [steamKey] })
  })
}

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS

export type CallLimits = { perMinute: number; perDay: number }

export type Reservation = 'granted' | 'busy' | 'paused'

export function reserveOpenDotaCalls(
  calls: number,
  now: Date,
  limits: CallLimits,
): Promise<Reservation> {
  const at = now.getTime()
  return inWriteTransaction(async (tx) => {
    const { rows } = await tx.execute({ sql: 'SELECT 1 FROM opendota_pause WHERE until > ?', args: [at] })
    if (rows.length > 0) return 'paused'
    await tx.execute({ sql: 'DELETE FROM opendota_calls WHERE at <= ?', args: [at - DAY_MS] })
    const { rowsAffected } = await tx.execute({
      sql: `INSERT INTO opendota_calls (at, calls)
            SELECT ?, ?
            WHERE (SELECT COALESCE(SUM(calls), 0) FROM opendota_calls WHERE at > ?) + ? <= ?
              AND (SELECT COALESCE(SUM(calls), 0) FROM opendota_calls WHERE at > ?) + ? <= ?`,
      args: [at, calls, at - MINUTE_MS, calls, limits.perMinute, at - DAY_MS, calls, limits.perDay],
    })
    return rowsAffected === 1 ? 'granted' : 'busy'
  })
}

export function pauseOpenDota(until: Date): Promise<void> {
  return inWriteTransaction(async (tx) => {
    await tx.execute({
      sql: `INSERT INTO opendota_pause (id, until) VALUES (1, ?)
            ON CONFLICT (id) DO UPDATE SET until = MAX(until, excluded.until)`,
      args: [until.getTime()],
    })
  })
}
