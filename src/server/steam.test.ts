import { test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { steamLoginUrl, verifySteamCallback } from './steam.ts'

const STEAM_ID = '76561198000000001'

function stubSteamVouches(t: TestContext) {
  return t.mock.method(globalThis, 'fetch', async () => new Response('ns:http://specs.openid.net/auth/2.0\nis_valid:true\n'))
}

function assertionFromSteam(loginNonce: string): URLSearchParams {
  const returnTo = new URL(steamLoginUrl(loginNonce)).searchParams.get('openid.return_to') ?? ''
  return new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'id_res',
    'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
    'openid.claimed_id': `https://steamcommunity.com/openid/id/${STEAM_ID}`,
    'openid.identity': `https://steamcommunity.com/openid/id/${STEAM_ID}`,
    'openid.return_to': returnTo,
    'openid.response_nonce': '2026-10-29T12:00:00Zabc',
    'openid.assoc_handle': '1234567890',
    'openid.signed': 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
    'openid.sig': 'c2lnbmF0dXJl',
  })
}

test('a Steam login started in this browser signs in', async (t) => {
  const fetch = stubSteamVouches(t)
  assert.deepEqual(await verifySteamCallback(assertionFromSteam('this-browser-nonce'), 'this-browser-nonce'), {
    ok: true,
    steamId64: STEAM_ID,
  })
  assert.equal(fetch.mock.callCount(), 1)
})

test('a Steam login started in another browser is rejected without asking Steam', async (t) => {
  const fetch = stubSteamVouches(t)
  assert.deepEqual(await verifySteamCallback(assertionFromSteam('attacker-nonce'), 'victim-nonce'), {
    ok: false,
    error: 'steam_session',
  })
  assert.equal(fetch.mock.callCount(), 0)
})

test('a Steam callback with no login in progress is rejected without asking Steam', async (t) => {
  const fetch = stubSteamVouches(t)
  assert.deepEqual(await verifySteamCallback(assertionFromSteam('attacker-nonce'), undefined), {
    ok: false,
    error: 'steam_session',
  })
  assert.equal(fetch.mock.callCount(), 0)
})
