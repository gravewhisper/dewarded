import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import satori, { type Font } from 'satori'
import UPNG from 'upng-js'
import { medalArt, medalLabel, medalTint, publicClaim, type ClaimId } from '#/domain'
import { claimPreview, claimPreviewVersion, type ClaimPreview, type PreviewFact } from '#/server/claimPreview'
import { readClaimImage, renderInTurn, writeClaimImage } from '#/server/claimImageFiles'
import { getClaim } from '#/server/db'
import { SITE_DOMAIN } from '#/site'

const CLAIM_IMAGE_SIZE = { width: 1200, height: 630 }

const FONT_FILES: Array<[string, Font['weight'], string]> = [
  ['Barlow', 400, 'Barlow-Regular.ttf'],
  ['Barlow', 500, 'Barlow-Medium.ttf'],
  ['Barlow', 600, 'Barlow-SemiBold.ttf'],
  ['Barlow Condensed', 600, 'BarlowCondensed-SemiBold.ttf'],
  ['Barlow Condensed', 700, 'BarlowCondensed-Bold.ttf'],
]

function retrying<T>(load: () => Promise<T>): () => Promise<T> {
  let loaded: Promise<T> | null = null
  return () =>
    (loaded ??= load().catch((error: unknown) => {
      loaded = null
      throw error
    }))
}

const loadFonts = retrying(() =>
  Promise.all(
    FONT_FILES.map(async ([name, weight, file]): Promise<Font> => ({
      name,
      weight,
      style: 'normal',
      data: await readFile(`og-fonts/${file}`),
    })),
  ),
)

const require = createRequire(import.meta.url)

const loadResvg = retrying(async () => {
  try {
    await initWasm(await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')))
  } catch (error) {
    if (!(error instanceof Error && error.message.startsWith('Already initialized'))) throw error
  }
})

const medalImages = new Map<string, Promise<string>>()

function medalImage(path: string): Promise<string> {
  let image = medalImages.get(path)
  if (!image) {
    image = readFile(`public${path}`).then((png) => `data:image/png;base64,${png.toString('base64')}`)
    medalImages.set(path, image)
    image.catch(() => medalImages.delete(path))
  }
  return image
}

const ON = '#eef2ec'
const MUTED = 'rgba(238, 242, 236, 0.72)'
const RULE = '1.5px solid rgba(238, 242, 236, 0.18)'
const MEDAL_SIZE = 360
const RANK_WIDTH = 640

function rankFontSize(label: string): number {
  return Math.min(136, Math.floor(RANK_WIDTH / (label.length * 0.44)))
}

export async function renderClaimImage(preview: ClaimPreview): Promise<Uint8Array<ArrayBuffer>> {
  const art = medalArt(preview.medal)
  const label = medalLabel(preview.medal)
  const [icon, star] = await Promise.all([
    medalImage(art.icon),
    art.star ? medalImage(art.star) : null,
  ])
  const svg = await satori(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: medalTint(preview.medal),
        color: ON,
        fontFamily: 'Barlow',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '26px 48px',
          borderBottom: RULE,
        }}
      >
        <span style={{ fontSize: 34, fontWeight: 600 }}>u/{preview.username}</span>
        <span
          style={{
            ...CAPS,
            fontSize: 22,
            color: MUTED,
            border: `1.5px dashed ${MUTED}`,
            borderRadius: 6,
            padding: '2px 12px',
          }}
        >
          Name claimed
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 44, padding: '0 48px' }}>
        <div style={{ display: 'flex', position: 'relative', width: MEDAL_SIZE, height: MEDAL_SIZE }}>
          <img src={icon} width={MEDAL_SIZE} height={MEDAL_SIZE} style={LAYER} />
          {star && <img src={star} width={MEDAL_SIZE} height={MEDAL_SIZE} style={LAYER} />}
          {art.boardRank !== null && <BoardRank rank={art.boardRank} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span
            style={{
              fontFamily: 'Barlow Condensed',
              fontWeight: 700,
              fontSize: rankFontSize(label),
              lineHeight: 0.92,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </span>
          <span
            style={{
              ...CAPS,
              marginTop: 22,
              border: `1.5px solid ${ON}`,
              borderRadius: 6,
              padding: '4px 16px',
              fontSize: 24,
            }}
          >
            Verified medal · Steam login
          </span>
          {preview.facts.length > 0 && (
            <div style={{ display: 'flex', gap: 44, marginTop: 30 }}>
              {preview.facts.map((fact) => (
                <Fact key={fact.label} {...fact} />
              ))}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 48px',
          borderTop: RULE,
          fontSize: 22,
          color: MUTED,
        }}
      >
        <span>Verified through Steam · rank from OpenDota</span>
        <span
          style={{
            fontFamily: 'Barlow Condensed',
            fontWeight: 700,
            letterSpacing: '0.14em',
            fontSize: 26,
            color: ON,
            textTransform: 'uppercase',
          }}
        >
          {SITE_DOMAIN}
        </span>
      </div>
    </div>,
    { ...CLAIM_IMAGE_SIZE, fonts: await loadFonts() },
  )
  await loadResvg()
  const renderer = new Resvg(svg)
  const image = renderer.render()
  try {
    return new Uint8Array(UPNG.encode([image.pixels.buffer as ArrayBuffer], image.width, image.height, 256))
  } finally {
    image.free()
    renderer.free()
  }
}

const CAPS = {
  fontFamily: 'Barlow Condensed',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
} as const

const LAYER = { position: 'absolute', top: 0, left: 0 } as const

function BoardRank({ rank }: { rank: number }) {
  const fontSize = Math.round(MEDAL_SIZE * 0.13)
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        width: MEDAL_SIZE,
        top: Math.round(MEDAL_SIZE * 0.82 - fontSize / 2),
        display: 'flex',
        justifyContent: 'center',
        fontFamily: 'Barlow Condensed',
        fontWeight: 700,
        fontSize,
        lineHeight: 1,
        color: '#fff6e0',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
      }}
    >
      {rank}
    </div>
  )
}

function Fact({ label, qualifier, value }: PreviewFact) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ display: 'flex', fontSize: 17, fontWeight: 500, color: MUTED }}>
        <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
        {qualifier && <span style={{ marginLeft: 5, letterSpacing: '0.02em' }}>({qualifier})</span>}
      </span>
      <span style={{ marginTop: 4, fontSize: 30, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

export type ClaimImage = { version: string; png: Uint8Array<ArrayBuffer> }

async function currentPreview(id: ClaimId): Promise<{ preview: ClaimPreview; version: string } | null> {
  const claim = await getClaim(id)
  if (!claim) return null
  const preview = claimPreview(publicClaim(claim))
  return { preview, version: claimPreviewVersion(preview) }
}

async function renderAndStore(id: ClaimId): Promise<ClaimImage | null> {
  const current = await currentPreview(id)
  if (!current) return null
  const png = await renderClaimImage(current.preview)
  await writeClaimImage(id, current.version, png)
  return { version: current.version, png }
}

const rendering = new Map<ClaimId, Promise<ClaimImage | null>>()

export async function claimImage(id: ClaimId): Promise<ClaimImage | null | 'busy'> {
  const current = await currentPreview(id)
  if (!current) return null
  const stored = await readClaimImage(id, current.version)
  if (stored) return { version: current.version, png: stored }
  let render = rendering.get(id)
  if (!render) {
    const queued = renderInTurn(() => renderAndStore(id))
    if (!queued) return 'busy'
    render = queued.finally(() => rendering.delete(id))
    rendering.set(id, render)
  }
  return render
}
