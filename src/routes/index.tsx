import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { deleted?: boolean } =>
    search.deleted === 1 || search.deleted === '1' ? { deleted: true } : {},
  component: Home,
})

function Home() {
  const { deleted } = Route.useSearch()
  return (
    <main className="prose">
      {deleted && <p className="notice">Your data has been deleted.</p>}
      <h1>Prove your Dota 2 medal on Reddit</h1>
      <p>
        Anyone can claim a rank in a Reddit comment. Medallion gives you a page at{' '}
        <code>/u/your-name</code> that shows the medal OpenDota reports for your Steam account,
        so you can link to it instead of posting a screenshot.
      </p>
      <p>
        It is opt-in. You log in with Reddit, which tells us only your username, and then sign in
        through Steam, which proves which account is yours without showing us your password. Your
        page shows your medal, your likely region and when it was checked. It never shows your
        Steam account.
      </p>
      <p>You can unlink or delete everything at any time.</p>
      <p>
        <a className="button primary" href="/link">
          Verify me
        </a>
      </p>
    </main>
  )
}
