import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { deleted?: boolean } =>
    search.deleted === 1 || search.deleted === '1' ? { deleted: true } : {},
  component: Home,
})

function Home() {
  const { deleted } = Route.useSearch()
  return (
    <main>
      {deleted && <p className="notice">Your data has been deleted.</p>}
      <h1>Prove your Dota 2 medal on Reddit</h1>
      <p>
        Medallion is opt-in. Log in with Reddit, then with Steam, and you get a public page at{' '}
        <code>/u/your-name</code> showing the medal OpenDota reports for that Steam account. Link
        it in a comment when your bracket matters.
      </p>
      <ul>
        <li>Reddit login only reads your username (the <code>identity</code> scope).</li>
        <li>Steam login only proves which Steam account is yours. We never see your password.</li>
        <li>You can unlink or delete your data at any time.</li>
      </ul>
      <p>
        <a className="button" href="/link">
          Verify me
        </a>
      </p>
    </main>
  )
}
