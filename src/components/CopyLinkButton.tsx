import { useEffect, useState } from 'react'

const LABELS = { idle: 'Copy link', copied: 'Copied', failed: 'Copy failed' } as const

export function CopyLinkButton({ path }: { path: string }) {
  const [state, setState] = useState<keyof typeof LABELS>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = setTimeout(() => setState('idle'), 2000)
    return () => clearTimeout(timer)
  }, [state])

  const copy = () =>
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(new URL(path, window.location.origin).href))
      .then(
        () => setState('copied'),
        () => setState('failed'),
      )

  return (
    <button type="button" className="button primary" onClick={copy} aria-live="polite">
      {LABELS[state]}
    </button>
  )
}
