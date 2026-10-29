import { MedalBadge } from '#/components/MedalBadge'
import { medalLabel, medalTint, regionShare, type PublicVerification } from '#/domain'
import { formatDay } from '#/format'

type Props = PublicVerification & { example?: boolean }

export function ProfileCard({ redditUsername, medal, region, checkedAt, example = false }: Props) {
  const MedalName = example ? 'p' : 'h1'
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
      <p className="card-foot">Medallion · Steam login, rank from OpenDota</p>
    </article>
  )
}
