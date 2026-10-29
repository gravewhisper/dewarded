import { useId } from 'react'
import { MedalBadge } from '#/components/MedalBadge'
import { EstimatedMmrAbout, InfoPopover } from '#/components/InfoPopover'
import {
  estimatedMmrRange,
  formatMmr,
  formatMmrRange,
  medalLabel,
  medalTint,
  mmrAllowed,
  regionShare,
  type PublicVerification,
} from '#/domain'
import { formatDay } from '#/format'

export type CardIdentity =
  | { kind: 'reddit-verified'; username: string }
  | { kind: 'reddit-claimed'; username: string }

type Props = Pick<PublicVerification, 'medal' | 'region' | 'checkedAt' | 'selfReportedMmr'> & {
  identity: CardIdentity
  example?: boolean
}

const BAR_LABELS: Record<CardIdentity['kind'], string> = {
  'reddit-verified': 'Verified',
  'reddit-claimed': 'Name claimed',
}

export function ProfileCard({
  identity,
  medal,
  region,
  checkedAt,
  selfReportedMmr,
  example = false,
}: Props) {
  const MedalName = example ? 'p' : 'h1'
  const popoverId = useId()
  const estimate = estimatedMmrRange(medal)
  const reportedMmr = mmrAllowed(medal) ? selfReportedMmr : null
  return (
    <article
      className="card profile-card"
      style={{ '--tint': medalTint(medal) } as React.CSSProperties}
    >
      <div className="card-bar" data-identity={identity.kind}>
        <span className="card-user">u/{identity.username}</span>
        <span className="caps card-bar-label">{example ? 'Example' : BAR_LABELS[identity.kind]}</span>
      </div>
      <div className="card-medal">
        <MedalBadge medal={medal} size={240} />
        <MedalName className="medal-name">{medalLabel(medal)}</MedalName>
        {identity.kind === 'reddit-claimed' && (
          <p className="caps medal-verified">Verified medal · Steam login</p>
        )}
      </div>
      <dl className="card-facts">
        <div>
          <dt className="caps">
            Plays in <span className="inferred">(inferred)</span>
          </dt>
          <dd title="Inferred from the region where most ranked games were played">
            {region ? regionShare(region) : 'Unknown'}
          </dd>
        </div>
        <div>
          <dt className="caps">Checked</dt>
          <dd>{formatDay(checkedAt)}</dd>
        </div>
      </dl>
      {estimate && (
        <div className="card-mmr">
          <div className="mmr-line">
            <span className="mmr-label">Est. MMR</span>
            <span className="mmr-value">{formatMmrRange(estimate)}</span>
            <EstimatedMmrAbout id={`${popoverId}-estimate`} />
          </div>
          {reportedMmr !== null && (
            <SelfReportedMmr
              id={`${popoverId}-self`}
              mmr={reportedMmr}
              identity={identity}
            />
          )}
        </div>
      )}
      <p className="card-foot">Dewarded · Steam login, rank from OpenDota</p>
    </article>
  )
}

function SelfReportedMmr({
  id,
  mmr,
  identity,
}: {
  id: string
  mmr: number
  identity: CardIdentity
}) {
  return (
    <div className="mmr-line">
      <span className="mmr-label">MMR</span>
      <span className="mmr-value">{formatMmr(mmr)}</span>
      <span className="mmr-tag">self-reported</span>
      <InfoPopover id={id} label="About self-reported MMR">
        Valve doesn't share MMR numbers outside the game, so Dewarded can't check this.{' '}
        {identity.kind === 'reddit-verified'
          ? `u/${identity.username} typed it in.`
          : 'The owner of this Steam account typed it in.'}{' '}
        The medal above is the verified part.
      </InfoPopover>
    </div>
  )
}
