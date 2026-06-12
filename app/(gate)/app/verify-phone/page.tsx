import { createClient } from "@/lib/supabase/server"
import { getCurrentTeacher } from "@/lib/supabase/teacher"
import { normalizeUsPhone } from "@/lib/phone"
import { VerifyPhoneForm } from "@/components/verify-phone-form"
import { redirect } from "next/navigation"

// Without this, the flag-off redirect gets baked in as a static page at build
// time — flipping PHONE_VERIFICATION_ENABLED on at runtime would then loop
// (static redirect → dashboard → gate redirect → back here).
export const dynamic = "force-dynamic"

export default async function VerifyPhonePage() {
  // Gate is feature-flagged off until Telnyx 10DLC clears — codes wouldn't
  // deliver before then.
  if (process.env.PHONE_VERIFICATION_ENABLED !== "true") {
    redirect("/app/dashboard")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/signin")

  const teacher = await getCurrentTeacher()
  if (!teacher || teacher.phone_verified) redirect("/app/dashboard")

  // Prefill from the teacher row or the phone collected at signup.
  const metaPhone = typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : ""
  const initialPhone = teacher.phone ?? normalizeUsPhone(metaPhone) ?? ""

  return <VerifyPhoneForm initialPhone={initialPhone} />
}
