import { REDDIT_USERNAME_PATTERN } from '#/domain'

type Props = { current: string | null; back: '/link' | '/me' }

export function ClaimNameForm({ current, back }: Props) {
  return (
    <form className={back === '/me' ? 'card card-pad name-form' : 'name-form'} method="post" action="/api/claim">
      <label className={back === '/me' ? 'mmr-form-label' : 'visually-hidden'} htmlFor="claim-username">
        {current === null ? 'Your Reddit username' : 'Change your Reddit username'}
      </label>
      <div className="mmr-form-row name-form-row">
        <span className="name-prefix" aria-hidden="true">
          u/
        </span>
        <input
          id="claim-username"
          name="username"
          required
          pattern={REDDIT_USERNAME_PATTERN}
          minLength={3}
          maxLength={20}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          defaultValue={current ?? ''}
          aria-describedby="claim-username-help"
        />
        <input type="hidden" name="back" value={back} />
        <button className="button primary">{current === null ? 'Create my page' : 'Save'}</button>
      </div>
      <p id="claim-username-help" className="muted small flush">
        Enter your own Reddit username, exactly as it appears on your profile. Your page only
        counts as proof once your Reddit profile links back to it.
      </p>
    </form>
  )
}
