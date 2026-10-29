import { MAX_MMR, MIN_SELF_REPORTED_MMR, formatMmr } from '#/domain'

export function MmrForm({ mmr, action }: { mmr: number | null; action: '/api/mmr' | '/api/claim-mmr' }) {
  return (
    <form className="card card-pad mmr-form" method="post" action={action}>
      <label className="mmr-form-label" htmlFor="mmr">
        Your MMR <span className="muted">(optional, self-reported)</span>
      </label>
      <p className="muted small flush">
        {mmr === null ? 'Not set.' : `Currently ${formatMmr(mmr)}.`}
      </p>
      <div className="mmr-form-row">
        <input
          id="mmr"
          name="mmr"
          type="number"
          inputMode="numeric"
          min={MIN_SELF_REPORTED_MMR}
          max={MAX_MMR}
          step={1}
          defaultValue={mmr ?? ''}
          aria-describedby="mmr-help"
        />
        <button className="button primary">Save</button>
        {mmr !== null && (
          <button className="button secondary" name="action" value="clear" formNoValidate>
            Clear
          </button>
        )}
      </div>
      <p id="mmr-help" className="muted small flush">
        Valve doesn't share MMR, so this can't be verified. It's shown as self-reported.
      </p>
    </form>
  )
}
