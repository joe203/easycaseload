/**
 * Resolve the public-facing origin for an incoming request.
 *
 * Behind Caddy the app container binds to 0.0.0.0:3000 (HOSTNAME in the
 * Dockerfile), so `new URL(request.url).origin` is the internal address, not
 * the public domain — redirects built from it are unreachable. Caddy forwards
 * the real host/proto, so prefer those.
 */
export function publicOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  const proto = request.headers.get("x-forwarded-proto") ?? "https"
  return host ? `${proto}://${host}` : new URL(request.url).origin
}

/**
 * Sanitize a post-auth redirect path so it can only point inside this app —
 * a relative path, never a protocol-relative `//host` open redirect.
 */
export function safeNext(raw: string | null, fallback = "/app/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback
  return raw
}
