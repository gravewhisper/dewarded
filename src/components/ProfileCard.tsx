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

type Props = PublicVerification & { example?: boolean }

export function ProfileCard({
  redditUsername,
  medal,
  region,
  checkedAt,
  selfReportedMmr,
  example = false,
}: Props) {
  const MedalName = example ? 'p' : 'h1'
  const estimate = estimatedMmrRange(medal)
  const reportedMmr = mmrAllowed(medal) ? selfReportedMmr : null
  return (
    <article
      className="card profile-card"
      style={{ '--tint': medalTint(medal) } as React.CSSProperties}
    >
      <div className="card-bar">
        <span className="card-user">u/{redditUsername}</span>
        <span className="caps">{example ? 'Example' : 'Verified'}</span>
      </div>
      <div className="card-medal">
        <MedalBadge medal={medal} size={240} />
        <MedalName className="medal-name">{medalLabel(medal)}</MedalName>
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
            <EstimatedMmrAbout id="mmr-estimate-about" />
          </div>
          {reportedMmr !== null && (
            <SelfReportedMmr mmr={reportedMmr} redditUsername={redditUsername} />
          )}
        </div>
      )}
      <p className="card-foot">Medallion · Steam login, rank from OpenDota</p>
    </article>
  )
}

function SelfReportedMmr({ mmr, redditUsername }: { mmr: number; redditUsername: string }) {
  return (
    <div className="mmr-line">
      <span className="mmr-label">MMR</span>
      <span className="mmr-value">{formatMmr(mmr)}</span>
      <span className="mmr-tag">self-reported</span>
      <InfoPopover id="mmr-self-about" label="About self-reported MMR">
        Valve doesn't share MMR numbers outside the game, so Medallion can't check this. u/
        {redditUsername} typed it in. The medal above is the verified part.
      </InfoPopover>
    </div>
  )
}
