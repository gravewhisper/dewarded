import { createFileRoute } from '@tanstack/react-router'
import { ProfileCard } from '#/components/ProfileCard'
import type { PublicVerification } from '#/domain'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { deleted?: boolean } =>
    search.deleted === 1 || search.deleted === '1' ? { deleted: true } : {},
  component: Home,
})

const EXAMPLE: PublicVerification = {
  redditUsername: 'your-name',
  medal: { kind: 'ranked', tier: 6, stars: 4 },
  region: { name: 'Europe', games: 91, share: 0.91 },
  checkedAt: new Date('2026-10-29T12:00:00Z'),
  selfReportedMmr: null,
}

function Home() {
  const { deleted } = Route.useSearch()
  return (
    <main className="page home">
      <section className="home-intro">
        {deleted && <p className="notice">Your data has been deleted.</p>}
        <h1>Prove your Dota 2 medal on Reddit</h1>
        <p>
          Anyone can claim a rank in a comment. Medallion gives you a page at{' '}
          <code>/u/your-name</code> with the medal OpenDota reports for your Steam account, so you
          can link to it instead of posting a screenshot.
        </p>
        <p>
          It is opt-in. Reddit tells us only your username, and Steam proves which account is
          yours without showing us your password. Your page never shows your Steam account. You can
          unlink or delete everything at any time.
        </p>
        <div className="actions">
          <a className="button primary" href="/link">
            Verify my medal
          </a>
        </div>
      </section>
      <ProfileCard {...EXAMPLE} example />
    </main>
  )
}
