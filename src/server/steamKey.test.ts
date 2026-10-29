import { test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import crypto, { type BinaryLike, type ScryptOptions } from 'node:crypto'
import { syncBuiltinESMExports } from 'node:module'
import type { SteamId64 } from '#/domain'
import { DEV_STEAM_ID_PEPPER, config, parseSteamIdPepper } from './config.ts'
import { deriveSteamKey, provenSteam, signedInSteam, steamIdentity } from './steamKey.ts'

const STEAM_ID = '76561198000000123' as SteamId64
const NEXT_STEAM_ID = '76561198000000124' as SteamId64
const PEPPER = '0123456789abcdef'.repeat(4)

type Hashes = { started: number; peakInFlight: number }

function countHashes(t: TestContext): Hashes {
  const scrypt = crypto.scrypt
  const hashes = { started: 0, peakInFlight: 0 }
  let inFlight = 0
  const counted = t.mock.method(
    crypto,
    'scrypt',
    (
      password: BinaryLike,
      salt: BinaryLike,
      keylen: number,
      options: ScryptOptions,
      done: (err: Error | null, key: Buffer) => void,
    ) => {
      hashes.started++
      inFlight++
      hashes.peakInFlight = Math.max(hashes.peakInFlight, inFlight)
      scrypt(password, salt, keylen, options, (err, key) => {
        inFlight--
        done(err, key)
      })
    },
  )
  syncBuiltinESMExports()
  t.after(() => {
    counted.mock.restore()
    syncBuiltinESMExports()
  })
  return hashes
}

test('the same Steam ID and pepper always give the same key', async () => {
  assert.equal(await deriveSteamKey(STEAM_ID, PEPPER), await deriveSteamKey(STEAM_ID, PEPPER))
})

test('different Steam IDs give different keys', async () => {
  assert.notEqual(await deriveSteamKey(STEAM_ID, PEPPER), await deriveSteamKey(NEXT_STEAM_ID, PEPPER))
})

test('a different pepper gives a different key for the same Steam ID', async () => {
  assert.notEqual(await deriveSteamKey(STEAM_ID, PEPPER), await deriveSteamKey(STEAM_ID, 'f'.repeat(64)))
})

test('a key is scrypt N=2^15 r=8 p=1 over the Steam ID, salted with the pepper, so stored keys stay valid across releases', async () => {
  assert.equal(
    await deriveSteamKey(STEAM_ID, PEPPER),
    '3138cb27a970b6176f705fc3f2553b77dd47da9971d8dad77a180ac91f4e70a0',
  )
})

test('production refuses to start without a pepper of 32 or more hex characters', () => {
  assert.throws(() => parseSteamIdPepper(undefined, true), /STEAM_ID_PEPPER/)
  assert.throws(() => parseSteamIdPepper('', true), /STEAM_ID_PEPPER/)
  assert.throws(() => parseSteamIdPepper('0123456789abcdef0123456789abcde', true), /STEAM_ID_PEPPER/)
  assert.throws(() => parseSteamIdPepper('g'.repeat(64), true), /STEAM_ID_PEPPER/)
  assert.equal(parseSteamIdPepper(PEPPER, true), PEPPER)
})

test('development without a pepper uses a fixed one, so dev pages keep their owners across restarts', () => {
  assert.equal(parseSteamIdPepper(undefined, false), DEV_STEAM_ID_PEPPER)
  assert.equal(parseSteamIdPepper(DEV_STEAM_ID_PEPPER, false), DEV_STEAM_ID_PEPPER)
})

test('production refuses the public development pepper', () => {
  assert.throws(() => parseSteamIdPepper(DEV_STEAM_ID_PEPPER, true), /STEAM_ID_PEPPER/)
})

test('a pepper typed in upper case is the same pepper as in lower case', () => {
  assert.equal(parseSteamIdPepper(PEPPER.toUpperCase(), true), PEPPER)
  assert.equal(parseSteamIdPepper(PEPPER.toUpperCase(), false), PEPPER)
})

test('a session signed in before keys were stored in it reads as signed out, and reading a session never hashes', async (t) => {
  const signedIn = await steamIdentity(STEAM_ID)
  const hashes = countHashes(t)
  assert.equal(signedInSteam({ steamId64: STEAM_ID }), null)
  assert.deepEqual(signedInSteam(signedIn), signedIn)
  assert.equal(signedInSteam({}), null)
  assert.equal(hashes.started, 0)
})

test('hashes run one at a time, however many ask at once', async (t) => {
  const hashes = countHashes(t)
  const steamIds = ['76561198000000901', '76561198000000902', '76561198000000903', '76561198000000904']
  await Promise.all(steamIds.map((steamId64) => deriveSteamKey(steamId64 as SteamId64, PEPPER)))
  assert.deepEqual(hashes, { started: 4, peakInFlight: 1 })
})

test('a Steam ID is hashed once, however many sign-ins and writes ask for its key', async (t) => {
  const steamId64 = '76561198000000911' as SteamId64
  const hashes = countHashes(t)
  const signIns = await Promise.all(Array.from({ length: 20 }, () => steamIdentity(steamId64)))
  const writes = await Promise.all(signIns.map((signedIn) => provenSteam(signedIn)))
  assert.equal(hashes.started, 1)
  const key = await deriveSteamKey(steamId64, config.steamIdPepper)
  assert.deepEqual(new Set([...signIns, ...writes].map((steam) => steam.steamKey)), new Set([key]))
})

test('a Steam ID is hashed again once ten minutes have passed since its last hash', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const steamId64 = '76561198000000921' as SteamId64
  const hashes = countHashes(t)
  await steamIdentity(steamId64)
  t.mock.timers.tick(10 * 60 * 1000 - 1)
  await steamIdentity(steamId64)
  assert.equal(hashes.started, 1)
  t.mock.timers.tick(1)
  await steamIdentity(steamId64)
  assert.equal(hashes.started, 2)
})

test("a write keys on the session's Steam ID, so a key copied into the session can't act on another page", async () => {
  const victim = await steamIdentity(NEXT_STEAM_ID)
  assert.deepEqual(
    await provenSteam({ steamId64: STEAM_ID, steamKey: victim.steamKey }),
    await steamIdentity(STEAM_ID),
  )
})
