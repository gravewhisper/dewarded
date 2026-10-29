import { Link, createFileRoute } from '@tanstack/react-router'
import { getVerifyMode } from '#/serverFns'
import { ISSUES_URL } from '#/site'

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: 'Privacy | Medallion' }] }),
  loader: () => getVerifyMode(),
  component: PrivacyPage,
})

function PrivacyPage() {
  return Route.useLoaderData() === 'backlink' ? <BacklinkPrivacy /> : <RedditPrivacy />
}

function SharedSections() {
  return (
    <>
      <h2>Deleting your data</h2>
      <p>
        "Delete my data" on <Link to="/me">My link</Link> removes your record immediately and
        your page stops existing.
      </p>

      <h2>Questions</h2>
      <p>
        Open an issue on <a href={ISSUES_URL}>GitHub</a>.
      </p>
    </>
  )
}

function BacklinkPrivacy() {
  return (
    <main className="page prose">
      <h1>What Medallion stores</h1>
      <p>
        Medallion stores nothing about you until you sign in through Steam and enter a Reddit
        username. You can delete everything at any time from <Link to="/me">My link</Link>.
      </p>

      <h2>Stored and shown publicly on your page</h2>
      <ul>
        <li>
          The Reddit username you type. It is shown as a claim, because Medallion can't confirm
          you own it. Readers confirm it by checking that your Reddit profile links to your page.
        </li>
        <li>Your medal, and your leaderboard rank if you are on the Immortal leaderboard.</li>
        <li>The region where you play the most ranked games, worked out from OpenDota data.</li>
        <li>When your medal was last checked.</li>
        <li>
          Your MMR, only if you are Immortal and choose to enter it. It is labelled as
          self-reported because Medallion can't check it. You can clear it at any time on{' '}
          <Link to="/me">My link</Link>, and it is cleared automatically if your medal drops below
          Immortal.
        </li>
        <li>A random page address, such as /p/k3x7q2mwab. It does not contain your Steam ID.</li>
      </ul>

      <h2>Stored but never shown</h2>
      <ul>
        <li>
          Your Steam ID and Dota account ID. Medallion needs them to check your medal again and to
          know the page is yours. Your public page does not show them or link to your Steam or
          OpenDota profile. Only you see your Steam ID, on <Link to="/me">My link</Link>.
        </li>
      </ul>

      <h2>Kept only in your browser</h2>
      <ul>
        <li>
          A signed login cookie with your Steam ID, so you stay signed in for up to 7 days.
          Logging out or deleting your data removes it.
        </li>
      </ul>

      <h2>Not stored</h2>
      <ul>
        <li>Your Steam password. Medallion never sees it.</li>
        <li>
          Anything from Reddit. Medallion does not connect to your Reddit account or read your
          profile.
        </li>
        <li>Your match history. Only the resulting region is saved.</li>
      </ul>

      <h2>Other services involved</h2>
      <ul>
        <li>Steam handles the sign-in.</li>
        <li>OpenDota receives your Dota account ID when Medallion checks your medal.</li>
        <li>
          Fly.io hosts the site. Like any web host, it processes request data such as IP addresses.
        </li>
      </ul>

      <SharedSections />
    </main>
  )
}

function RedditPrivacy() {
  return (
    <main className="page prose">
      <h1>What Medallion stores</h1>
      <p>
        Medallion stores nothing about you until you finish both the Reddit and the Steam login.
        You can delete everything at any time from <Link to="/me">My link</Link>.
      </p>

      <h2>Stored and shown publicly on your page</h2>
      <ul>
        <li>Your Reddit username. It is the address of your page.</li>
        <li>Your medal, and your leaderboard rank if you are on the Immortal leaderboard.</li>
        <li>The region where you play the most ranked games, worked out from OpenDota data.</li>
        <li>When your medal was last checked.</li>
        <li>
          Your MMR, only if you are Immortal and choose to enter it. It is labelled as
          self-reported because Medallion can't check it. You can clear it at any time on{' '}
          <Link to="/me">My link</Link>, and it is cleared automatically if your medal drops below
          Immortal or you link a different Steam account.
        </li>
      </ul>

      <h2>Stored but never shown</h2>
      <ul>
        <li>
          Your Steam ID and Dota account ID. Medallion needs them to check your medal again. Your
          public page does not show them or link to your Steam or OpenDota profile. Only you see
          your Steam ID, on <Link to="/me">My link</Link>.
        </li>
      </ul>

      <h2>Kept only in your browser</h2>
      <ul>
        <li>
          A signed login cookie with your Reddit username, so you stay logged in for up to 7 days.
          Logging out or deleting your data removes it.
        </li>
      </ul>

      <h2>Not stored</h2>
      <ul>
        <li>Your Reddit or Steam password. Medallion never sees them.</li>
        <li>
          Reddit access tokens. Medallion asks Reddit only for your username, uses the token once,
          and discards it.
        </li>
        <li>Your match history. Only the resulting region is saved.</li>
      </ul>

      <h2>Other services involved</h2>
      <ul>
        <li>Reddit and Steam handle the logins.</li>
        <li>OpenDota receives your Dota account ID when Medallion checks your medal.</li>
        <li>
          Fly.io hosts the site. Like any web host, it processes request data such as IP addresses.
        </li>
      </ul>

      <SharedSections />
    </main>
  )
}
