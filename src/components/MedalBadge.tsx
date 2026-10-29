import { medalArt, medalLabel, type Medal } from '#/domain'

export function MedalBadge({ medal, size }: { medal: Medal; size: number }) {
  const { icon, star, boardRank } = medalArt(medal)
  return (
    <span className="medal-badge" style={{ '--medal-size': `${size}px` } as React.CSSProperties}>
      <img src={icon} alt={medalLabel(medal)} width={size} height={size} />
      {star && <img src={star} alt="" width={size} height={size} />}
      {boardRank !== null && (
        <span className="medal-rank" aria-hidden="true">
          {boardRank}
        </span>
      )}
    </span>
  )
}
