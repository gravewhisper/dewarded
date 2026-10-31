import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import type { ClaimId, PublicClaim } from '#/domain'
import { renderClaimImage } from './claimImage.tsx'
import { CLAIM_IMAGE_RENDER_VERSION, claimPreview, claimPreviewPath, claimPreviewVersion } from './claimPreview.ts'

const claim: PublicClaim = {
  id: 'abcdefghij' as ClaimId,
  claimedRedditUsername: 'skylightblue1',
  medal: { kind: 'immortal', leaderboardRank: 412 },
  region: { name: 'Singapore', percent: 96 },
  checkedAt: new Date('2026-10-01T00:00:00Z'),
  selfReportedMmr: 9200,
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

test('a claim renders as a 1200x630 PNG', async () => {
  const png = Buffer.from(await renderClaimImage(claimPreview(claim)))
  assert.deepEqual([...png.subarray(0, 8)], PNG_SIGNATURE)
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630])
})

test('the preview shows public facts in card order and hides MMR below Immortal', () => {
  assert.deepEqual(claimPreview(claim).facts.map((fact) => fact.value), ['Singapore, 96%', '≈ 5,620+', '9,200'])
  const ranked = claimPreview({ ...claim, medal: { kind: 'ranked', tier: 6, stars: 5 }, region: null })
  assert.deepEqual(ranked.facts.map((fact) => fact.value), ['≈ 4,466–4,619'])
})

test('the image URL changes whenever the drawn content changes, and only then', () => {
  const path = (c: PublicClaim) => claimPreviewPath(c.id, claimPreview(c))
  assert.equal(path({ ...claim, checkedAt: new Date() }), path(claim))
  assert.notEqual(path({ ...claim, claimedRedditUsername: 'someone_else' }), path(claim))
  assert.notEqual(path({ ...claim, selfReportedMmr: 9300 }), path(claim))
  assert.match(path(claim), /^\/og\/p\/abcdefghij\.png\?v=[\w-]{12}$/)
})

test('a change to the drawing comes with a new render version, which changes the image URL', async () => {
  const preview = claimPreview(claim)
  const drawing = createHash('sha256').update(await renderClaimImage(preview)).digest('hex')
  assert.deepEqual(
    { renderVersion: CLAIM_IMAGE_RENDER_VERSION, drawing },
    { renderVersion: 2, drawing: '170c9222e96e19bf7d076970d10c5e43027fec0a9dee823b8d8f972487633386' },
    'the drawing changed: bump CLAIM_IMAGE_RENDER_VERSION and pin the new drawing hash',
  )
  assert.notEqual(claimPreviewVersion(preview, CLAIM_IMAGE_RENDER_VERSION + 1), claimPreviewVersion(preview))
})
