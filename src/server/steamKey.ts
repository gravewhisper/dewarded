import { scrypt } from 'node:crypto'
import type { SteamId64, SteamIdentity, SteamKey } from '#/domain'
import { config } from './config'

const KEY_BYTES = 32
const COST = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

export function deriveSteamKey(steamId64: SteamId64, pepper: string): Promise<SteamKey> {
  return new Promise((resolve, reject) => {
    scrypt(steamId64, pepper, KEY_BYTES, COST, (err, key) =>
      err ? reject(err) : resolve(key.toString('hex') as SteamKey),
    )
  })
}

export async function steamIdentity(steamId64: SteamId64): Promise<SteamIdentity> {
  return { steamId64, steamKey: await deriveSteamKey(steamId64, config.steamIdPepper) }
}

type SignedSteam = { steamId64?: SteamId64; steamKey?: SteamKey }

export async function signedInSteam({ steamId64, steamKey }: SignedSteam): Promise<SteamIdentity | null> {
  if (!steamId64) return null
  return steamKey ? { steamId64, steamKey } : steamIdentity(steamId64)
}

export async function provenSteam({ steamId64 }: SignedSteam): Promise<SteamIdentity | null> {
  return steamId64 ? steamIdentity(steamId64) : null
}
