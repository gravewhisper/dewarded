import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import type { Medal, Region, Verification } from '#/domain'
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
      checked_at INTEGER NOT NULL
    )
  `)
  return client
}

export async function getVerification(redditUsername: string): Promise<Verification | null> {
  const db = await getDb()
  const { rows } = await db.execute({
    sql: 'SELECT * FROM verifications WHERE reddit_username = ?',
    args: [redditUsername],
  })
  const row = rows[0]
  if (!row) return null
  return {
    redditUsername: String(row.reddit_username),
    steamId64: String(row.steam_id64),
    accountId: Number(row.account_id),
    medal: JSON.parse(String(row.medal)) as Medal,
    region: row.region === null ? null : (JSON.parse(String(row.region)) as Region),
    checkedAt: new Date(Number(row.checked_at)),
  }
}

export async function saveVerification(v: Verification): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: `INSERT INTO verifications (reddit_username, steam_id64, account_id, medal, region, checked_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT (reddit_username) DO UPDATE SET
            steam_id64 = excluded.steam_id64,
            account_id = excluded.account_id,
            medal = excluded.medal,
            region = excluded.region,
            checked_at = excluded.checked_at`,
    args: [
      v.redditUsername,
      v.steamId64,
      v.accountId,
      JSON.stringify(v.medal),
      v.region === null ? null : JSON.stringify(v.region),
      v.checkedAt.getTime(),
    ],
  })
}

export async function deleteVerification(redditUsername: string): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: 'DELETE FROM verifications WHERE reddit_username = ?',
    args: [redditUsername],
  })
}
