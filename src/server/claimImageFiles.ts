import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { ClaimId } from '#/domain'
import { config } from './config'

const MAX_WAITING_RENDERS = 8

let waitingRenders = 0
let lastTurn: Promise<unknown> = Promise.resolve()

function inTurn<T>(work: () => Promise<T>): Promise<T> {
  const turn = lastTurn.then(work)
  lastTurn = turn.catch(() => {})
  return turn
}

export function renderInTurn<T>(render: () => Promise<T>): Promise<T> | null {
  if (waitingRenders >= MAX_WAITING_RENDERS) return null
  waitingRenders++
  return inTurn(() => {
    waitingRenders--
    return render()
  })
}

function ifMissing<T>(fallback: T) {
  return (error: NodeJS.ErrnoException): T => {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const imageFile = (id: ClaimId, version: string) => join(config.claimImageDir, `${id}-${version}.png`)

export function readClaimImage(id: ClaimId, version: string): Promise<Uint8Array<ArrayBuffer> | null> {
  return readFile(imageFile(id, version)).catch(ifMissing(null))
}

async function removeFiles(id: ClaimId, keep: string | null): Promise<void> {
  const files = await readdir(config.claimImageDir).catch(ifMissing([]))
  await Promise.all(
    files
      .filter((file) => file.startsWith(`${id}-`) && file !== keep)
      .map((file) => rm(join(config.claimImageDir, file), { force: true })),
  )
}

export async function writeClaimImage(id: ClaimId, version: string, png: Uint8Array): Promise<void> {
  const file = imageFile(id, version)
  const temp = `${file}.${randomUUID()}.tmp`
  await mkdir(config.claimImageDir, { recursive: true })
  await writeFile(temp, png)
  await rename(temp, file)
  await removeFiles(id, basename(file))
}

export function removeClaimImages(id: ClaimId): Promise<void> {
  return inTurn(() => removeFiles(id, null))
}
