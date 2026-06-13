import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { publicOrigin, safeNext } from "@/lib/auth-url"

// PKCE code flow — used by OAuth (same-device). Email confirmation now uses the
// cross-device token-hash flow at /auth/confirm.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = publicOrigin(request)
  const code = searchParams.get("code")
  const redirect = safeNext(searchParams.get("redirect"))

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
