type Props = { id: string; label: string; children: React.ReactNode }

export function InfoPopover({ id, label, children }: Props) {
  return (
    <>
      <button type="button" className="info-button" popoverTarget={id} aria-label={label}>
        i
      </button>
      <div id={id} className="popover" popover="auto">
        {children}
      </div>
    </>
  )
}

export const LIQUIPEDIA_MMR_URL = 'https://liquipedia.net/dota2/Matchmaking/Seasonal_Rankings'

export function EstimatedMmrAbout({ id }: { id: string }) {
  return (
    <InfoPopover id={id} label="About estimated MMR">
      Valve doesn't publish MMR. This is the usual range for this medal, from community estimates on{' '}
      <a href={LIQUIPEDIA_MMR_URL}>Liquipedia</a> (last revised 2019). Real MMR is often a few hundred
      off.
    </InfoPopover>
  )
}
