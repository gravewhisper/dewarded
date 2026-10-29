import { Link, createFileRoute } from '@tanstack/react-router'
import { LIQUIPEDIA_MMR_URL } from '#/components/InfoPopover'
import { MAX_MMR, MIN_SELF_REPORTED_MMR, formatMmr } from '#/domain'
import { PRIVACY_EMAIL, REPO_URL } from '#/site'

const DESCRIPTION =
  'How the Steam login works, why Dewarded beats posting a Dotabuff link, how to check a Reddit name, and what Dewarded stores.'

export const Route = createFileRoute('/faq')({
  head: () => ({
    meta: [
      { title: 'FAQ | Dewarded' },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: 'FAQ | Dewarded' },
      { property: 'og:description', content: DESCRIPTION },
    ],
  }),
  component: FaqPage,
})

type Question = { id: string; question: string; answer: React.ReactNode }

const QUESTIONS: Question[] = [
  {
    id: 'steam-login',
    question: 'Is the Steam login safe?',
    answer: (
      <>
        <p>
          You sign in on steamcommunity.com itself, so check the address bar before typing
          anything. Steam tells Dewarded only your Steam account ID. Dewarded never sees your
          password, and the sign-in gives it no way to trade or to see your inventory.
        </p>
        <p>
          Dewarded never asks for an API key or a trade link. Any site that does is a scam.{' '}
          <a href={`${REPO_URL}/blob/master/src/server/steam.ts`}>Read the login code</a>.
        </p>
      </>
    ),
  },
  {
    id: 'dotabuff',
    question: 'Why not just post my Dotabuff?',
    answer: (
      <p>
        You can. But anyone can paste someone else's Dotabuff, and a Dotabuff link shows your full
        match history and your Steam profile. A Dewarded page shows only your medal and never your
        Steam account.
      </p>
    ),
  },
  {
    id: 'reddit-name',
    question: 'How do I know the Reddit name on a page is real?',
    answer: (
      <>
        <p>
          Check who posted the link. If u/name posts their own page, Reddit itself shows it's them.
        </p>
        <p>
          If someone else posted it, open u/name's Reddit profile and check that it links to that
          exact page. Reddit no longer lets small sites check usernames automatically, so Dewarded
          shows the name as claimed.
        </p>
      </>
    ),
  },
  {
    id: 'smurfs',
    question: 'Can smurfs or bought accounts fake it?',
    answer: (
      <p>
        Yes. If you sign in with a high-ranked account you bought, the page shows that account's
        medal. Nothing outside Valve can detect that.
      </p>
    ),
  },
  {
    id: 'mmr',
    question: "Why doesn't it show my exact MMR?",
    answer: (
      <>
        <p>
          Valve doesn't share MMR outside the game. The range on a page is a community estimate for
          your medal, from <a href={LIQUIPEDIA_MMR_URL}>Liquipedia</a> (last revised 2019).
        </p>
        <p>
          Immortal players can enter their own MMR, from {formatMmr(MIN_SELF_REPORTED_MMR)} to{' '}
          {formatMmr(MAX_MMR)}. The page marks it as self-reported.
        </p>
      </>
    ),
  },
  {
    id: 'region',
    question: "My region isn't showing.",
    answer: (
      <p>
        Your region comes from your ranked match history, so it needs "Expose Public Match Data"
        turned on in Dota 2. Your medal shows either way, because it comes from your in-game
        profile card.
      </p>
    ),
  },
  {
    id: 'refresh',
    question: 'My medal or leaderboard rank looks old.',
    answer: (
      <>
        <p>
          Every page shows the date the medal was last checked. The page owner can press "Refresh
          medal" on their own page once an hour while signed in through Steam.
        </p>
        <p>
          Dewarded asks OpenDota to re-fetch the account first, but OpenDota can take a minute to
          do that. A medal that changed moments ago may only show up on the next refresh.
        </p>
      </>
    ),
  },
  {
    id: 'data',
    question: 'What does Dewarded store, and how do I delete it?',
    answer: (
      <>
        <p>
          Dewarded stores a one-way, keyed hash of your Steam ID, not the ID itself, and uses it to
          recognise your Steam account when you sign in again. The live database does not contain
          your Steam ID, and no page on the site shows it, not even to you. Backups taken before
          Dewarded switched to the hash may contain it, and they are deleted after the switch. It
          stays in your signed login cookie, in your own browser. The server reads it from that
          cookie only in memory, to work out the hash and to fetch your medal, and forgets it
          within ten minutes. That is why refreshing your medal needs you signed in through Steam.
        </p>
        <p>
          Dewarded also stores the Reddit username you typed, your medal, your region, the date it
          was checked, and your MMR if you entered one.
        </p>
        <p>
          "Delete my data" on <Link to="/me">My link</Link> removes all of it and your page.{' '}
          <Link to="/privacy">The privacy page</Link> has the full list.
        </p>
        <p>
          For privacy requests, email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
        </p>
      </>
    ),
  },
  {
    id: 'valve',
    question: 'Is it affiliated with Valve?',
    answer: (
      <p>
        No. Dota 2 is a trademark of Valve Corporation. Rank data comes from{' '}
        <a href="https://www.opendota.com">OpenDota</a>, and the code is open source on{' '}
        <a href={REPO_URL}>GitHub</a>.
      </p>
    ),
  },
]

function FaqPage() {
  return (
    <main className="page prose">
      <h1>Questions</h1>
      {QUESTIONS.map(({ id, question, answer }) => (
        <section key={id} id={id} className="faq-item">
          <h2>
            <a href={`#${id}`}>{question}</a>
          </h2>
          {answer}
        </section>
      ))}
    </main>
  )
}
