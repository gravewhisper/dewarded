import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient, type Client, type Row, type Transaction } from '@libsql/client'
import { carriedMmr, mmrAllowed, type MedalCheck, type Medal, type Region, type Verification } from '#/domain'
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
  return client
}

function toVerification(row: Row): Verification {
  return {
    redditUsername: String(row.reddit_username),
    steamId64: String(row.steam_id64),
    accountId: Number(row.account_id),
    medal: JSON.parse(String(row.medal)) as Medal,
    region: row.region === null ? null : (JSON.parse(String(row.region)) as Region),
    checkedAt: new Date(Number(row.checked_at)),
    selfReportedMmr: row.self_reported_mmr === null ? null : Number(row.self_reported_mmr),
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

async function inWriteTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  const tx = await (await getDb()).transaction('write')
  try {
    const result = await work(tx)
    await tx.commit()
    return result
  } finally {
    tx.close()
  }
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

export async function deleteVerification(redditUsername: string): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: 'DELETE FROM verifications WHERE reddit_username = ?',
    args: [redditUsername],
  })
}
