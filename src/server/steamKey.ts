import { scrypt } from 'node:crypto'
import { setTimeout } from 'node:timers'
import type { SteamId64, SteamIdentity, SteamKey } from '#/domain'
import { config } from './config'

const KEY_BYTES = 32
const COST = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const RECENT_KEY_MS = 10 * 60 * 1000
const RECENT_KEY_LIMIT = 1000

let lastHash: Promise<unknown> = Promise.resolve()

function hashOneAtATime(input: string, pepper: string): Promise<string> {
  const hash = lastHash.then(
    () =>
      new Promise<string>((resolve, reject) => {
        scrypt(input, pepper, KEY_BYTES, COST, (err, key) => (err ? reject(err) : resolve(key.toString('hex'))))
      }),
  )
  lastHash = hash.catch(() => {})
  return hash
}

export async function deriveSteamKey(steamId64: SteamId64, pepper: string): Promise<SteamKey> {
  return (await hashOneAtATime(steamId64, pepper)) as SteamKey
}

export function derivePepperCheck(pepper: string): Promise<string> {
  return hashOneAtATime('dewarded pepper check', pepper)
}

const recentKeys = new Map<SteamId64, Promise<SteamKey>>()

function forget(steamId64: SteamId64, key: Promise<SteamKey>): void {
  if (recentKeys.get(steamId64) === key) recentKeys.delete(steamId64)
}

function recentSteamKey(steamId64: SteamId64): Promise<SteamKey> {
  const recent = recentKeys.get(steamId64)
  if (recent) return recent
  const key = deriveSteamKey(steamId64, config.steamIdPepper)
  recentKeys.set(steamId64, key)
  key.catch(() => forget(steamId64, key))
  setTimeout(() => forget(steamId64, key), RECENT_KEY_MS).unref()
  const [oldest] = recentKeys.keys()
  if (recentKeys.size > RECENT_KEY_LIMIT) recentKeys.delete(oldest)
  return key
}

export async function steamIdentity(steamId64: SteamId64): Promise<SteamIdentity> {
  return { steamId64, steamKey: await recentSteamKey(steamId64) }
}

type SignedSteam = { steamId64?: SteamId64; steamKey?: SteamKey }

export function signedInSteam({ steamId64, steamKey }: SignedSteam): SteamIdentity | null {
  return steamId64 && steamKey ? { steamId64, steamKey } : null
}

export function provenSteam({ steamId64 }: SteamIdentity): Promise<SteamIdentity> {
  return steamIdentity(steamId64)
}
