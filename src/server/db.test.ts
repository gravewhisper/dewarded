import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SteamCheck, SteamKey } from '#/domain'

process.env.DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), 'dewarded-db-')), 'test.db')}`
const db = await import('./db.ts')

const check = (steamKey: SteamKey): SteamCheck => ({
  steamKey,
  medal: { kind: 'ranked', tier: 3, stars: 2 },
  region: null,
  checkedAt: new Date(0),
  regionCheckedAt: new Date(0),
})

const key = (n: number) => n.toString(16).padStart(64, '0') as SteamKey

const PERSON = key(1)
const OTHER = key(2)

before(async () => {
  await db.saveClaim(check(OTHER), 'other_name')
  await db.saveVerification({ ...check(OTHER), redditUsername: 'other_name' })
})

async function remains() {
  return {
    claim: (await db.getClaimBySteamKey(PERSON)) !== null,
    verification: (await db.getVerification('person_name')) !== null,
    otherClaim: (await db.getClaimBySteamKey(OTHER)) !== null,
    otherVerification: (await db.getVerification('other_name')) !== null,
  }
}

const NOTHING_OF_PERSON = { claim: false, verification: false, otherClaim: true, otherVerification: true }

test('deleting by Steam account removes the claim and any verification of that account', async () => {
  await db.saveClaim(check(PERSON), 'person_name')
  await db.saveVerification({ ...check(PERSON), redditUsername: 'person_name' })
  await db.deletePersonData({ steamKey: PERSON })
  assert.deepEqual(await remains(), NOTHING_OF_PERSON)
})

test('deleting by Reddit name removes the verification and any claim of its Steam account', async () => {
  await db.saveClaim(check(PERSON), 'person_name')
  await db.saveVerification({ ...check(PERSON), redditUsername: 'person_name' })
  await db.deletePersonData({ redditUsername: 'person_name' })
  assert.deepEqual(await remains(), NOTHING_OF_PERSON)
})

test('thirty claims saved at once are all stored', async () => {
  const steamKeys = Array.from({ length: 30 }, (_, i) => key(100 + i))
  await Promise.all(steamKeys.map((steamKey) => db.saveClaim(check(steamKey), 'burst_name')))
  const stored = await Promise.all(steamKeys.map((steamKey) => db.getClaimBySteamKey(steamKey)))
  assert.equal(stored.filter((claim) => claim !== null).length, 30)
})
