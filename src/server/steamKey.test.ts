import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SteamId64 } from '#/domain'
import { DEV_STEAM_ID_PEPPER, parseSteamIdPepper } from './config.ts'
import { deriveSteamKey } from './steamKey.ts'

const STEAM_ID = '76561198065514372' as SteamId64
const NEXT_STEAM_ID = '76561198065514373' as SteamId64
const PEPPER = '0123456789abcdef'.repeat(4)

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
    '1ca540d4b0ce70323451fe02ee1d083b45bae538614a1d7bd3a609ed557ee3dc',
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
  assert.equal(parseSteamIdPepper(DEV_STEAM_ID_PEPPER, true), DEV_STEAM_ID_PEPPER)
})
