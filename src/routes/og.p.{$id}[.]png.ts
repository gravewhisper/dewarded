import { createFileRoute } from '@tanstack/react-router'
import { parseClaimId } from '#/domain'
import { claimImage } from '#/server/claimImage'

const IMMUTABLE = 'public, max-age=31536000, immutable'
const REVALIDATE = 'public, max-age=300'

export const Route = createFileRoute('/og/p/{$id}.png')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = parseClaimId(params.id)
        const image = id && (await claimImage(id))
        if (!image) return new Response('Not Found', { status: 404 })
        if (image === 'busy') {
          return new Response('Busy', { status: 503, headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' } })
        }
        const current = new URL(request.url).searchParams.get('v') === image.version
        return new Response(image.png, {
          headers: { 'Content-Type': 'image/png', 'Cache-Control': current ? IMMUTABLE : REVALIDATE },
        })
      },
    },
  },
})
