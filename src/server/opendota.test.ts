import { test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { fetchMedal } from './opendota.ts'

function stubOpenDota(t: TestContext, playerStatus: number) {
  t.mock.method(console, 'error', () => {})
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input)
    if (url.endsWith('/refresh')) return new Response('{}', { status: 200 })
    if (url.includes('/counts')) return new Response(JSON.stringify({ region: {} }), { status: 200 })
    return new Response(JSON.stringify({ error: 'Not Found' }), { status: playerStatus })
  })
}

test('an account OpenDota has not indexed yet reports no_profile', async (t) => {
  stubOpenDota(t, 404)
  assert.deepEqual(await fetchMedal(4294967270), { ok: false, error: 'no_profile' })
})

test('a rate limited player lookup reports rate_limited', async (t) => {
  stubOpenDota(t, 429)
  assert.deepEqual(await fetchMedal(4294967270), { ok: false, error: 'rate_limited' })
})

test('a failing player lookup reports upstream', async (t) => {
  stubOpenDota(t, 500)
  assert.deepEqual(await fetchMedal(4294967270), { ok: false, error: 'upstream' })
})

test('a player lookup that never answers is cut off and reports upstream', async (t) => {
  t.mock.method(console, 'error', () => {})
  t.mock.method(AbortSignal, 'timeout', () =>
    AbortSignal.abort(new DOMException('The operation timed out.', 'TimeoutError')),
  )
  t.mock.method(globalThis, 'fetch', (_input: string | URL | Request, init?: RequestInit) =>
    init?.signal?.aborted ? Promise.reject(init.signal.reason) : new Promise<Response>(() => {}),
  )
  assert.deepEqual(await fetchMedal(4294967270), { ok: false, error: 'upstream' })
})

test('a rate limited refresh request reports rate_limited without looking up the player', async (t) => {
  t.mock.method(console, 'error', () => {})
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    calls.push(String(input))
    return new Response('{}', { status: 429 })
  })
  assert.deepEqual(await fetchMedal(4294967270), { ok: false, error: 'rate_limited' })
  assert.equal(calls.length, 1)
})
