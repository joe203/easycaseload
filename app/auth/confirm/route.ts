import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { publicOrigin, safeNext } from "@/lib/auth-url"

/**
 * Cross-device email confirmation (token-hash flow).
 *
 * Unlike the PKCE code flow (/auth/callback), this verifies the OTP entirely
 * server-side from the token in the link, so a teacher can register on their
 * phone and click the confirmation email on any device. Driven by the GoTrue
 * email templates, which link here with token_hash + type (see
 * docs/auth-email-templates.md).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = publicOrigin(request)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = safeNext(searchParams.get("next"))

  if (tokenHash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      // Tag the user if the signup path didn't (parity with /auth/callback).
      if (data.user && !data.user.user_metadata?.app) {
        await supabase.auth.updateUser({ data: { app: "easycaseload" } })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error?error=auth_confirm_failed`)
}
