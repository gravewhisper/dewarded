import { Link, createFileRoute } from '@tanstack/react-router'
import { ProfileCard } from '#/components/ProfileCard'
import type { PublicVerification, VerifyMode } from '#/domain'
import { getVerifyMode } from '#/serverFns'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { deleted?: boolean } =>
    search.deleted === 1 || search.deleted === '1' ? { deleted: true } : {},
  loader: () => getVerifyMode(),
  component: Home,
})

const EXAMPLE: Omit<PublicVerification, 'redditUsername'> = {
  medal: { kind: 'ranked', tier: 6, stars: 4 },
  region: { name: 'Europe', games: 91, share: 0.91 },
  checkedAt: new Date('2026-10-29T12:00:00Z'),
  selfReportedMmr: null,
}

const INTRO: Record<VerifyMode, React.ReactNode> = {
  reddit: (
    <>
      <p>
        Anyone can claim a rank in a comment. Dewarded gives you a page at{' '}
        <code>/u/your-name</code> with the medal OpenDota reports for your Steam account, so you
        can link to it instead of posting a screenshot.
      </p>
      <p>
        It is opt-in. Reddit tells us only your username, and Steam proves which account is
        yours without showing us your password. Your page never shows your Steam account. You can
        unlink or delete everything at any time.
      </p>
    </>
  ),
  backlink: (
    <>
      <p>
        Anyone can claim a rank in a comment. Sign in through Steam and Dewarded gives you a page
        with the medal OpenDota reports for your account, so you can link to it instead of posting
        a screenshot.
      </p>
      <p>
        Add that link to your Reddit profile. Anyone who doubts you can open your profile and see
        it points to your medal page. Steam proves which account is yours without showing us your
        password, and your page never shows your Steam account. You can delete everything at any
        time.
      </p>
    </>
  ),
}

function Home() {
  const { deleted } = Route.useSearch()
  const mode = Route.useLoaderData()
  return (
    <main className="page home">
      <section className="home-intro">
        {deleted && <p className="notice">Your data has been deleted.</p>}
        <h1>Prove your Dota 2 medal on Reddit</h1>
        {INTRO[mode]}
        <div className="actions">
          <a className="button primary" href="/link">
            Verify my medal
          </a>
        </div>
        <p>
          Questions? <Link to="/faq">Read the FAQ</Link>.
        </p>
      </section>
      <ProfileCard
        identity={{
          kind: mode === 'reddit' ? 'reddit-verified' : 'reddit-claimed',
          username: 'your-name',
        }}
        {...EXAMPLE}
        example
      />
    </main>
  )
}
