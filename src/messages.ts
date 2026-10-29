export const ERROR_MESSAGES: Record<string, string> = {
  reddit_first: 'Log in with Reddit before linking Steam.',
  reddit_denied: 'Reddit login was cancelled.',
  reddit_state: 'Reddit login expired or was tampered with. Try again.',
  reddit_failed: 'Reddit did not confirm your identity. Try again.',
  reddit_unconfigured: 'Reddit login is not configured on this server.',
  steam_session: 'That Steam sign-in expired or was started in another browser. Try again.',
  malformed: 'Steam login response was invalid.',
  rejected: 'Steam did not vouch for that login.',
  unreachable: 'Could not reach Steam to confirm your login. Try again.',
  no_profile:
    "OpenDota hasn't seen this Steam account before. Dewarded asked it to look the account up. Try again in a minute.",
  rate_limited: 'OpenDota is rate limiting us. Try again in a few minutes.',
  upstream: 'OpenDota returned an error. Try again later.',
  busy: 'Medal checks are busy right now. Try again in a few minutes.',
  cooldown: 'Checked recently. Try again later.',
  not_linked: 'No linked Steam account.',
  mmr_invalid: 'MMR must be a whole number from 5,620 (Immortal) to 20,000. Nothing was saved.',
  mmr_not_immortal: 'Self-reported MMR is only available for Immortal medals.',
  steam_first: 'Sign in through Steam first.',
  steam_again: 'Sign in through Steam again to refresh your medal.',
  delete_unconfirmed: 'Tick the box to confirm before deleting.',
  claim_name_invalid:
    'Reddit usernames are 3 to 20 letters, numbers, underscores or hyphens. Nothing was saved.',
}

export function errorMessage(code: string | undefined): string | null {
  if (!code) return null
  return Object.hasOwn(ERROR_MESSAGES, code) ? ERROR_MESSAGES[code] : 'Something went wrong.'
}
