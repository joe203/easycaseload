import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Behind Caddy, request.url resolves to the container's internal bind
// (HOSTNAME=0.0.0.0:3000 from the Dockerfile), so redirects built from its
// origin send the browser to an unreachable address. Derive the public origin
// from the reverse proxy's forwarded headers instead — Caddy sets both.
function publicOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  const proto = request.headers.get("x-forwarded-proto") ?? "https"
  return host ? `${proto}://${host}` : new URL(request.url).origin
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = publicOrigin(request)
  const code = searchParams.get("code")
  const redirect = searchParams.get("redirect") || "/app/dashboard"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // OAuth signups cannot carry the app tag client-side (the SDK's
      // signInWithOAuth has no `data` option), so tag here: anyone completing
      // auth through EasyCaseload's callback is an EasyCaseload user. Email
      // signups already carry the tag from signUp/signInWithOtp.
      // NOTE (pre-Google-OAuth-enablement): the tag lands AFTER the
      // auth.users INSERT, so the teacher-creation trigger will have skipped
      // OAuth signups — enabling Google requires a find-or-create teacher
      // step here. Tracked in CURRENT_STATUS.md.
      const appTag = data.user?.user_metadata?.app
      if (data.user && !appTag) {
        await supabase.auth.updateUser({ data: { app: "easycaseload" } })
      }
      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error?error=auth_callback_failed`)
}
