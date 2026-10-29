import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SteamCheck } from '#/domain'

process.env.DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), 'dewarded-deletion-')), 'test.db')}`
const db = await import('./db.ts')
const { deleteIfConfirmed } = await import('./deletion.ts')

const check = (steamId64: string): SteamCheck => ({
  steamId64,
  accountId: 1,
  medal: { kind: 'ranked', tier: 3, stars: 2 },
  region: null,
  checkedAt: new Date(0),
  regionCheckedAt: new Date(0),
})

const STEAM_ID = '76561198000000301'

function form(fields: Record<string, string>): FormData {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) body.set(key, value)
  return body
}

test('a delete request without the confirmation tick deletes nothing', async () => {
  await db.saveClaim(check(STEAM_ID), 'keep_me')
  for (const body of [form({}), form({ confirm: 'on' })]) {
    assert.equal(await deleteIfConfirmed(body, { steamId64: STEAM_ID }), 'delete_unconfirmed')
    assert.notEqual(await db.getClaimBySteamId(STEAM_ID), null)
  }
})

test('a delete request with the confirmation tick deletes the claim', async () => {
  await db.saveClaim(check(STEAM_ID), 'keep_me')
  assert.equal(await deleteIfConfirmed(form({ confirm: 'yes' }), { steamId64: STEAM_ID }), 'deleted')
  assert.equal(await db.getClaimBySteamId(STEAM_ID), null)
})
