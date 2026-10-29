import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient, type Client, type Row, type Transaction } from '@libsql/client'
import { randomBytes } from 'node:crypto'
import {
  CLAIM_ID_LENGTH,
  carriedMmr,
  claimIdFromBytes,
  mmrAllowed,
  type Claim,
  type ClaimId,
  type MedalCheck,
  type Medal,
  type Region,
  type SteamCheck,
  type Verification,
} from '#/domain'
import { config } from './config'

let clientPromise: Promise<Client> | null = null

function getDb(): Promise<Client> {
  clientPromise ??= open()
  return clientPromise
}

async function open(): Promise<Client> {
  if (config.databaseUrl.startsWith('file:')) {
    mkdirSync(dirname(config.databaseUrl.slice('file:'.length)), { recursive: true })
  }
  const client = createClient({
    url: config.databaseUrl,
    authToken: config.databaseAuthToken,
  })
  await client.execute(`
    CREATE TABLE IF NOT EXISTS verifications (
      reddit_username TEXT PRIMARY KEY,
      steam_id64 TEXT NOT NULL,
      account_id INTEGER NOT NULL,
      medal TEXT NOT NULL,
      region TEXT,
      checked_at INTEGER NOT NULL,
      self_reported_mmr INTEGER
    )
  `)
  const { rows: columns } = await client.execute('PRAGMA table_info(verifications)')
  if (!columns.some((column) => column.name === 'self_reported_mmr')) {
    await client.execute('ALTER TABLE verifications ADD COLUMN self_reported_mmr INTEGER')
  }
  await client.execute(`
    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      steam_id64 TEXT UNIQUE NOT NULL,
      account_id INTEGER NOT NULL,
      claimed_reddit_username TEXT NOT NULL,
      medal TEXT NOT NULL,
      region TEXT,
      checked_at INTEGER NOT NULL,
      self_reported_mmr INTEGER
    )
  `)
  return client
}

function toSteamCheck(row: Row): SteamCheck {
  return {
    steamId64: String(row.steam_id64),
    accountId: Number(row.account_id),
    medal: JSON.parse(String(row.medal)) as Medal,
    region: row.region === null ? null : (JSON.parse(String(row.region)) as Region),
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
      sql: `INSERT INTO verifications (reddit_username, steam_id64, account_id, medal, region, checked_at, self_reported_mmr)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (reddit_username) DO UPDATE SET
              steam_id64 = excluded.steam_id64,
              account_id = excluded.account_id,
              medal = excluded.medal,
              region = excluded.region,
              checked_at = excluded.checked_at,
              self_reported_mmr = excluded.self_reported_mmr`,
      args: [
        check.redditUsername,
        check.steamId64,
        check.accountId,
        JSON.stringify(check.medal),
        check.region === null ? null : JSON.stringify(check.region),
        check.checkedAt.getTime(),
        carriedMmr(previous, check),
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

async function readClaim(db: Client | Transaction, steamId64: string): Promise<Claim | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM claims WHERE steam_id64 = ?',
    args: [steamId64],
  })
  return rows[0] ? toClaim(rows[0]) : null
}

export async function getLatestSteamCheck(steamId64: string): Promise<SteamCheck | null> {
  const { rows } = await (await getDb()).execute({
    sql: `SELECT steam_id64, account_id, medal, region, checked_at FROM claims WHERE steam_id64 = ?
          UNION ALL
          SELECT steam_id64, account_id, medal, region, checked_at FROM verifications WHERE steam_id64 = ?
          ORDER BY checked_at DESC LIMIT 1`,
    args: [steamId64, steamId64],
  })
  return rows[0] ? toSteamCheck(rows[0]) : null
}

export async function getClaimBySteamId(steamId64: string): Promise<Claim | null> {
  return readClaim(await getDb(), steamId64)
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
    const previous = await readClaim(tx, check.steamId64)
    const id = previous?.id ?? claimIdFromBytes(randomBytes(CLAIM_ID_LENGTH))
    await tx.execute({
      sql: `INSERT INTO claims (id, steam_id64, account_id, claimed_reddit_username, medal, region, checked_at, self_reported_mmr)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (steam_id64) DO UPDATE SET
              account_id = excluded.account_id,
              claimed_reddit_username = excluded.claimed_reddit_username,
              medal = excluded.medal,
              region = excluded.region,
              checked_at = excluded.checked_at,
              self_reported_mmr = excluded.self_reported_mmr`,
      args: [
        id,
        check.steamId64,
        check.accountId,
        claimedRedditUsername,
        JSON.stringify(check.medal),
        check.region === null ? null : JSON.stringify(check.region),
        check.checkedAt.getTime(),
        carriedMmr(previous, check),
      ],
    })
    return id
  })
}

export function renameClaim(steamId64: string, claimedRedditUsername: string): Promise<boolean> {
  return inWriteTransaction(async (tx) => {
    const { rowsAffected } = await tx.execute({
      sql: 'UPDATE claims SET claimed_reddit_username = ? WHERE steam_id64 = ?',
      args: [claimedRedditUsername, steamId64],
    })
    return rowsAffected > 0
  })
}

export function setClaimMmr(steamId64: string, mmr: number | null): Promise<MmrSaveResult> {
  return inWriteTransaction(async (tx) => {
    const current = await readClaim(tx, steamId64)
    if (!current) return 'not_linked'
    if (!mmrAllowed(current.medal)) return 'mmr_not_immortal'
    await tx.execute({
      sql: 'UPDATE claims SET self_reported_mmr = ? WHERE steam_id64 = ?',
      args: [mmr, steamId64],
    })
    return 'saved'
  })
}

export type Person = { steamId64: string } | { redditUsername: string }

export function deletePersonData(person: Person): Promise<void> {
  return inWriteTransaction(async (tx) => {
    const steamId64 =
      'steamId64' in person
        ? person.steamId64
        : (await readVerification(tx, person.redditUsername))?.steamId64
    if ('redditUsername' in person) {
      await tx.execute({
        sql: 'DELETE FROM verifications WHERE reddit_username = ?',
        args: [person.redditUsername],
      })
    }
    if (steamId64 === undefined) return
    await tx.execute({ sql: 'DELETE FROM verifications WHERE steam_id64 = ?', args: [steamId64] })
    await tx.execute({ sql: 'DELETE FROM claims WHERE steam_id64 = ?', args: [steamId64] })
  })
}
