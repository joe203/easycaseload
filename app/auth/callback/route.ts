import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
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
