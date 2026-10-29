import { useEffect, useState } from 'react'
import { ProfileCard, type CardIdentity } from '#/components/ProfileCard'
import { medalLabel, type PublicVerification } from '#/domain'

type Example = Omit<PublicVerification, 'redditUsername'>

const CHECKED_AT = new Date('2026-10-29T12:00:00Z')

const EXAMPLES: Example[] = [
  {
    medal: { kind: 'ranked', tier: 1, stars: 2 },
    region: { name: 'South Africa', percent: 88 },
    checkedAt: CHECKED_AT,
    selfReportedMmr: null,
  },
  {
    medal: { kind: 'ranked', tier: 3, stars: 3 },
    region: { name: 'Singapore', percent: 76 },
    checkedAt: CHECKED_AT,
    selfReportedMmr: null,
  },
  {
    medal: { kind: 'ranked', tier: 5, stars: 5 },
    region: { name: 'US East', percent: 83 },
    checkedAt: CHECKED_AT,
    selfReportedMmr: null,
  },
  {
    medal: { kind: 'ranked', tier: 6, stars: 4 },
    region: { name: 'Europe', percent: 91 },
    checkedAt: CHECKED_AT,
    selfReportedMmr: null,
  },
  {
    medal: { kind: 'ranked', tier: 7, stars: 2 },
    region: { name: 'China', percent: 95 },
    checkedAt: CHECKED_AT,
    selfReportedMmr: null,
  },
  {
    medal: { kind: 'immortal', leaderboardRank: 48 },
    region: { name: 'Stockholm', percent: 64 },
    checkedAt: CHECKED_AT,
    selfReportedMmr: 6900,
  },
]

const FIRST = 3
const ADVANCE_MS = 3500

type Hold = 'pointer' | 'focus' | 'picked'

export function ExampleCards({ identity }: { identity: CardIdentity }) {
  const [active, setActive] = useState(FIRST)
  const [holds, setHolds] = useState<ReadonlySet<Hold>>(new Set())
  const hold = (reason: Hold, on: boolean) =>
    setHolds((current) => {
      if (current.has(reason) === on) return current
      const next = new Set(current)
      if (on) next.add(reason)
      else next.delete(reason)
      return next
    })
  const held = holds.size > 0

  useEffect(() => {
    if (held) return
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setInterval> | undefined
    const schedule = () => {
      clearInterval(timer)
      if (reducedMotion.matches || document.visibilityState !== 'visible') return
      timer = setInterval(() => setActive((i) => (i + 1) % EXAMPLES.length), ADVANCE_MS)
    }
    schedule()
    document.addEventListener('visibilitychange', schedule)
    reducedMotion.addEventListener('change', schedule)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', schedule)
      reducedMotion.removeEventListener('change', schedule)
    }
  }, [held])

  return (
    <section
      className="examples"
      aria-roledescription="carousel"
      aria-label="Example medal pages"
      onPointerEnter={() => hold('pointer', true)}
      onPointerLeave={() => hold('pointer', false)}
      onFocus={() => hold('focus', true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) hold('focus', false)
      }}
    >
      <div className="examples-deck">
        {EXAMPLES.map((example, i) => (
          <div key={i} className="examples-slide" inert={i !== active}>
            <ProfileCard identity={identity} {...example} example />
          </div>
        ))}
      </div>
      <div className="examples-dots">
        {EXAMPLES.map(({ medal }, i) => (
          <button
            key={i}
            type="button"
            className="examples-dot"
            aria-label={`Show ${medalLabel(medal)} example`}
            aria-pressed={i === active}
            onClick={() => {
              setActive(i)
              hold('picked', true)
            }}
          />
        ))}
      </div>
    </section>
  )
}
