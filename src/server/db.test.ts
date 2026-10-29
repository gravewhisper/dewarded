import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SteamCheck } from '#/domain'

process.env.DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), 'dewarded-db-')), 'test.db')}`
const db = await import('./db.ts')

const check = (steamId64: string): SteamCheck => ({
  steamId64,
  accountId: 1,
  medal: { kind: 'ranked', tier: 3, stars: 2 },
  region: null,
  checkedAt: new Date(0),
})

const PERSON = '76561198000000001'
const OTHER = '76561198000000002'

before(async () => {
  await db.saveClaim(check(OTHER), 'other_name')
  await db.saveVerification({ ...check(OTHER), redditUsername: 'other_name' })
})

async function remains() {
  return {
    claim: (await db.getClaimBySteamId(PERSON)) !== null,
    verification: (await db.getVerification('person_name')) !== null,
    otherClaim: (await db.getClaimBySteamId(OTHER)) !== null,
    otherVerification: (await db.getVerification('other_name')) !== null,
  }
}

const NOTHING_OF_PERSON = { claim: false, verification: false, otherClaim: true, otherVerification: true }

test('deleting by Steam account removes the claim and any verification of that account', async () => {
  await db.saveClaim(check(PERSON), 'person_name')
  await db.saveVerification({ ...check(PERSON), redditUsername: 'person_name' })
  await db.deletePersonData({ steamId64: PERSON })
  assert.deepEqual(await remains(), NOTHING_OF_PERSON)
})

test('deleting by Reddit name removes the verification and any claim of its Steam account', async () => {
  await db.saveClaim(check(PERSON), 'person_name')
  await db.saveVerification({ ...check(PERSON), redditUsername: 'person_name' })
  await db.deletePersonData({ redditUsername: 'person_name' })
  assert.deepEqual(await remains(), NOTHING_OF_PERSON)
})

test('thirty claims saved at once are all stored', async () => {
  const steamIds = Array.from({ length: 30 }, (_, i) => `765611980000010${String(i).padStart(2, '0')}`)
  await Promise.all(steamIds.map((steamId64) => db.saveClaim(check(steamId64), 'burst_name')))
  const stored = await Promise.all(steamIds.map((steamId64) => db.getClaimBySteamId(steamId64)))
  assert.equal(stored.filter((claim) => claim !== null).length, 30)
})
