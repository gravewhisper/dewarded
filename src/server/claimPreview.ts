import { createHash } from 'node:crypto'
import {
  estimatedMmrRange,
  formatMmr,
  formatMmrRange,
  mmrAllowed,
  regionShare,
  type ClaimId,
  type Medal,
  type PublicClaim,
} from '#/domain'

export type PreviewFact = { label: string; qualifier: string | null; value: string }

export type ClaimPreview = { username: string; medal: Medal; facts: PreviewFact[] }

export function claimPreview(c: PublicClaim): ClaimPreview {
  const estimate = estimatedMmrRange(c.medal)
  const reportedMmr = mmrAllowed(c.medal) ? c.selfReportedMmr : null
  const facts: Array<PreviewFact | null> = [
    c.region && { label: 'Plays in', qualifier: 'inferred', value: regionShare(c.region) },
    estimate && { label: 'Est. MMR', qualifier: null, value: formatMmrRange(estimate) },
    reportedMmr !== null
      ? { label: 'MMR', qualifier: 'self-reported', value: formatMmr(reportedMmr) }
      : null,
  ]
  return {
    username: c.claimedRedditUsername,
    medal: c.medal,
    facts: facts.filter((fact) => fact !== null),
  }
}

export const CLAIM_IMAGE_RENDER_VERSION = 2

export function claimPreviewVersion(preview: ClaimPreview, renderVersion = CLAIM_IMAGE_RENDER_VERSION): string {
  return createHash('sha256')
    .update(JSON.stringify([renderVersion, preview]))
    .digest('base64url')
    .slice(0, 12)
}

export function claimPreviewPath(id: ClaimId, preview: ClaimPreview): string {
  return `/og/p/${id}.png?v=${claimPreviewVersion(preview)}`
}
