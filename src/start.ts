import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const csrf = createCsrfMiddleware({
  filter: ({ request }) => !SAFE_METHODS.has(request.method),
  origin: (origin, { request }) =>
    origin === new URL(request.url).origin ||
    origin === process.env.PUBLIC_URL?.replace(/\/$/, ''),
})

export const startInstance = createStart(() => ({
  requestMiddleware: [csrf],
}))
