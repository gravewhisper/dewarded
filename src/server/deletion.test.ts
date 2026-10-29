import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SteamCheck, SteamKey } from '#/domain'

process.env.DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), 'dewarded-deletion-')), 'test.db')}`
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

test('a delete request without the confirmation tick deletes nothing', async () => {
  await db.saveClaim(check(STEAM_KEY), 'keep_me')
  for (const body of [form({}), form({ confirm: 'on' })]) {
    assert.equal(await deleteIfConfirmed(body, { steamKey: STEAM_KEY }), 'delete_unconfirmed')
    assert.notEqual(await db.getClaimBySteamKey(STEAM_KEY), null)
  }
})

test('a delete request with the confirmation tick deletes the claim', async () => {
  await db.saveClaim(check(STEAM_KEY), 'keep_me')
  assert.equal(await deleteIfConfirmed(form({ confirm: 'yes' }), { steamKey: STEAM_KEY }), 'deleted')
  assert.equal(await db.getClaimBySteamKey(STEAM_KEY), null)
})
