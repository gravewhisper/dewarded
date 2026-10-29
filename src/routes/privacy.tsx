import { Link, createFileRoute } from '@tanstack/react-router'
import { getVerifyMode } from '#/serverFns'
import { ISSUES_URL, PRIVACY_EMAIL, REPO_URL } from '#/site'

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: 'Privacy | Dewarded' }] }),
  loader: () => getVerifyMode(),
  component: PrivacyPage,
})

function PrivacyPage() {
  return Route.useLoaderData() === 'backlink' ? <BacklinkPrivacy /> : <RedditPrivacy />
}

type ModeCopy = {
  cookieContents: string
  signIn: React.ReactNode
  publicPagePath: React.ReactNode
  consent: string
  corrections: React.ReactNode
}

const STEAM_KEY_STORED = (
  <li>
    A one-way, keyed hash of your Steam ID, not the ID itself. Dewarded uses it to recognise your
    Steam account when you sign in again. Your public page does not show it or link to your Steam
    or OpenDota profile.
  </li>
)

const STEAM_ID_NOT_STORED = (
  <li>
    Your Steam ID and Dota account ID. Steam sends your Steam ID to Dewarded when you sign in, and
    your signed login cookie keeps it in your own browser while you stay signed in. The server
    reads it from that cookie only in memory, to work out the hash when you sign in or change your
    page and to fetch your medal from OpenDota when you refresh it, and forgets it within ten
    minutes of working out the hash. Your Dota account ID is a shorter form of your Steam ID that
    OpenDota uses. The database contains neither, which is why refreshing your medal needs you
    signed in through Steam. No page on the site shows either of them, not even to you.
  </li>
)

const BACKLINK: ModeCopy = {
  cookieContents: 'your Steam ID and its hash',
  signIn: <li>Steam handles the sign-in.</li>,
  publicPagePath: (
    <>
      The path of a public page is its random address, such as <code>/p/k3x7q2mwab</code>.
    </>
  ),
  consent: 'You give it by signing in through Steam and claiming a Reddit username.',
  corrections: (
    <li>
      Correct it. On <Link to="/me">My link</Link> you can change the Reddit username you claimed
      and, once you are Immortal, change or clear your MMR. "Refresh medal" on your page checks
      your medal again.
    </li>
  ),
}

const REDDIT: ModeCopy = {
  cookieContents: 'your Reddit username and, once you link Steam, your Steam ID and its hash',
  signIn: <li>Reddit and Steam handle the logins.</li>,
  publicPagePath: (
    <>
      The path of a public page contains your Reddit username, such as <code>/u/yourname</code>.
    </>
  ),
  consent: 'You give it by logging in with Reddit and linking your Steam account.',
  corrections: (
    <li>
      Correct it. Once you are Immortal you can change or clear your MMR on{' '}
      <Link to="/me">My link</Link>. "Refresh medal" on your page checks your medal again. To
      link a different Steam account, unlink Steam on My link and link the other one. Your Reddit
      username comes from your Reddit login, so to use another one, log in with that account.
    </li>
  ),
}

function SharedSections({ copy }: { copy: ModeCopy }) {
  return (
    <>
      <h2>Cookies</h2>
      <p>
        Dewarded sets one cookie. It is a signed login cookie with {copy.cookieContents}, so you
        stay signed in for up to 7 days. It is set only once you start signing in, and logging out or
        deleting your data removes it. Dewarded sets no analytics or tracking cookies, so there is
        no cookie banner.
      </p>

      <h2>Who else handles your data</h2>
      <ul>
        <li>
          Fly.io hosts the site and the database in Singapore. Like any web host, it processes
          request data such as IP addresses.
        </li>
        {copy.signIn}
        <li>OpenDota receives your Dota account ID when Dewarded checks your medal.</li>
      </ul>
      <p>
        This means your data is processed outside the EU. The fonts are served by Dewarded itself,
        so pages load nothing from Google or any other third party. Other sites are contacted only
        when you click a link to them.
      </p>

      <h2>Why Dewarded can store it</h2>
      <p>
        Dewarded stores your data only with your consent. {copy.consent} You can withdraw consent
        at any time by deleting your data.
      </p>

      <h2>How long it is kept</h2>
      <p>
        Your record stays until you delete it. Refreshing your medal replaces the old medal,
        leaderboard rank, region and check date, so no history builds up.
      </p>
      <p>
        The server also logs each request's method, path, status and response time, and any server
        errors. The log leaves out query strings, IP addresses, Steam IDs and Dota account IDs.{' '}
        {copy.publicPagePath} Fly.io keeps these logs for a limited time.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          See what is stored about you. Your public page shows your medal, region, check date,
          Reddit name and MMR. Your Steam ID is not shown anywhere on the site, not even to you on{' '}
          <Link to="/me">My link</Link>. It exists only in your signed login cookie, in your own
          browser, and in server memory for up to ten minutes after the server works out its hash.
        </li>
        {copy.corrections}
        <li>
          Delete it. "Delete my data" on <Link to="/me">My link</Link> removes your record
          immediately and your page stops existing.
        </li>
      </ul>

      <h2>Age</h2>
      <p>You must be at least 16 to use Dewarded.</p>

      <h2>Who runs Dewarded</h2>
      <p>
        Dewarded is a free, open-source hobby project. The code is on{' '}
        <a href={REPO_URL}>GitHub</a>.
      </p>
      <p>
        For privacy requests, email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. For
        everything else, open an issue on <a href={ISSUES_URL}>GitHub</a>.
      </p>
    </>
  )
}

function BacklinkPrivacy() {
  return (
    <main className="page prose">
      <h1>What Dewarded stores</h1>
      <p>
        Dewarded stores nothing about you until you sign in through Steam and enter a Reddit
        username. You can delete everything at any time from <Link to="/me">My link</Link>.
      </p>

      <h2>Stored and shown publicly on your page</h2>
      <ul>
        <li>
          The Reddit username you type. It is shown as a claim, because Dewarded can't confirm
          you own it. Readers confirm it by checking that your Reddit profile links to your page.
        </li>
        <li>Your medal, and your leaderboard rank if you are on the Immortal leaderboard.</li>
        <li>The region where you play the most ranked games, worked out from OpenDota data.</li>
        <li>When your medal was last checked.</li>
        <li>
          Your MMR, only if you are Immortal and choose to enter it. It is labelled as
          self-reported because Dewarded can't check it. You can clear it at any time on{' '}
          <Link to="/me">My link</Link>, and it is cleared automatically if your medal drops below
          Immortal.
        </li>
        <li>A random page address, such as /p/k3x7q2mwab. It does not contain your Steam ID.</li>
      </ul>

      <h2>Stored but never shown</h2>
      <ul>{STEAM_KEY_STORED}</ul>

      <h2>Not stored</h2>
      <ul>
        {STEAM_ID_NOT_STORED}
        <li>Your Steam password. Dewarded never sees it.</li>
        <li>
          Anything from Reddit. Dewarded does not connect to your Reddit account or read your
          profile.
        </li>
        <li>Your match history. Only the resulting region is saved.</li>
      </ul>

      <SharedSections copy={BACKLINK} />
    </main>
  )
}

function RedditPrivacy() {
  return (
    <main className="page prose">
      <h1>What Dewarded stores</h1>
      <p>
        Dewarded stores nothing about you until you finish both the Reddit and the Steam login.
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
          self-reported because Dewarded can't check it. You can clear it at any time on{' '}
          <Link to="/me">My link</Link>, and it is cleared automatically if your medal drops below
          Immortal or you link a different Steam account.
        </li>
      </ul>

      <h2>Stored but never shown</h2>
      <ul>{STEAM_KEY_STORED}</ul>

      <h2>Not stored</h2>
      <ul>
        {STEAM_ID_NOT_STORED}
        <li>Your Reddit or Steam password. Dewarded never sees them.</li>
        <li>
          Reddit access tokens. Dewarded asks Reddit only for your username, uses the token once,
          and discards it.
        </li>
        <li>Your match history. Only the resulting region is saved.</li>
      </ul>

      <SharedSections copy={REDDIT} />
    </main>
  )
}
