export function redirectTo(location: string, status: 302 | 303 = 302): Response {
  return new Response(null, { status, headers: { Location: location } })
}

export function linkError(code: string): Response {
  return redirectTo(`/link?error=${encodeURIComponent(code)}`)
}
