"use server"

import { createHmac, randomInt, timingSafeEqual } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentTeacher } from "@/lib/supabase/teacher"
import { normalizeUsPhone } from "@/lib/phone"
import { sendSms } from "@/lib/telnyx"
import type { SupabaseClient } from "@supabase/supabase-js"

// SMS-pumping mitigations (V2 roadmap §5): resend cooldown, hourly caps per
// teacher and per phone, bounded attempts, short code lifetime, +1 only.
const CODE_TTL_MINUTES = 10
const RESEND_COOLDOWN_SECONDS = 60
const MAX_CODES_PER_HOUR = 5
const MAX_ATTEMPTS = 5

// Server-secret HMAC: a leaked phone_verifications table can't be
// brute-forced offline without the key. Keyed per teacher so a code is only
// valid for the account it was issued to.
function hashCode(code: string, teacherId: string): string {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not configured")
  return createHmac("sha256", key).update(`${teacherId}:${code}`).digest("hex")
}

export async function sendPhoneCode(rawPhone: string): Promise<{ error: string | null }> {
  const teacher = await getCurrentTeacher()
  if (!teacher) return { error: "Not authenticated" }
  if (teacher.phone_verified) return { error: null }

  const phone = normalizeUsPhone(rawPhone)
  if (!phone) return { error: "Enter a valid US mobile number" }

  const admin = createAdminClient()
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: latest } = await admin
    .from("phone_verifications")
    .select("created_at")
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest) {
    const elapsed = (Date.now() - new Date(latest.created_at).getTime()) / 1000
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return { error: `Wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting another code` }
    }
  }

  const { count: teacherCount } = await admin
    .from("phone_verifications")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacher.id)
    .gte("created_at", hourAgo)

  const { count: phoneCount } = await admin
    .from("phone_verifications")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", hourAgo)

  if ((teacherCount ?? 0) >= MAX_CODES_PER_HOUR || (phoneCount ?? 0) >= MAX_CODES_PER_HOUR) {
    return { error: "Too many codes requested — try again in an hour" }
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0")

  const { error: insertError } = await admin.from("phone_verifications").insert({
    teacher_id: teacher.id,
    phone,
    code_hash: hashCode(code, teacher.id),
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString(),
  })
  if (insertError) return { error: "Could not start verification — try again" }

  const { error: smsError } = await sendSms(
    phone,
    `Your EasyCaseload verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
  )
  if (smsError) return { error: smsError }

  return { error: null }
}

export async function verifyPhoneCode(rawCode: string): Promise<{ error: string | null }> {
  const teacher = await getCurrentTeacher()
  if (!teacher) return { error: "Not authenticated" }
  if (teacher.phone_verified) return { error: null }

  const code = rawCode.trim()
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code" }

  const admin = createAdminClient()

  const { data: row } = await admin
    .from("phone_verifications")
    .select("id, phone, code_hash, attempts, expires_at")
    .eq("teacher_id", teacher.id)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return { error: "No code pending — request a new one" }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { error: "That code expired — request a new one" }
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { error: "Too many attempts — request a new code" }
  }

  // Count the attempt before comparing so a failed compare can't be retried free.
  await admin.from("phone_verifications").update({ attempts: row.attempts + 1 }).eq("id", row.id)

  const expected = Buffer.from(row.code_hash, "hex")
  const actual = Buffer.from(hashCode(code, teacher.id), "hex")
  const match = expected.length === actual.length && timingSafeEqual(expected, actual)
  if (!match) {
    const left = MAX_ATTEMPTS - (row.attempts + 1)
    return {
      error:
        left > 0
          ? `That code didn't match — ${left} attempt${left === 1 ? "" : "s"} left`
          : "Too many attempts — request a new code",
    }
  }

  const linkError = await linkVerifiedPhone(admin, teacher.id, row.phone)
  if (linkError) return { error: linkError }

  await admin
    .from("phone_verifications")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", row.id)

  return { error: null }
}

// Ownership of the number is proven; attach it to this teacher. teachers.phone
// is unique, so an existing holder must be resolved first.
async function linkVerifiedPhone(
  admin: SupabaseClient,
  teacherId: string,
  phone: string,
): Promise<string | null> {
  const { data: holder } = await admin
    .from("teachers")
    .select("id, auth_user_id")
    .eq("phone", phone)
    .neq("id", teacherId)
    .maybeSingle()

  if (holder) {
    if (holder.auth_user_id) {
      return "This number is already linked to another account. Sign in with that account, or contact support."
    }
    // An SMS-created, never-registered teacher holds this phone (they texted
    // in before signing up on the web). Absorb that record — its raw_intake
    // history follows via merge_teachers — then take the number.
    await admin.from("teachers").update({ phone: null }).eq("id", holder.id)
    await admin.rpc("merge_teachers", { p_canonical: teacherId, p_duplicate: holder.id })
  }

  const { error } = await admin
    .from("teachers")
    .update({ phone, phone_verified: true })
    .eq("id", teacherId)
  if (error) return "Could not save your number — try again"

  // Verified identity row; OTP success outranks any prior unverified claim
  // (same convention as email in migration 016).
  await admin.from("teacher_identities").upsert(
    { teacher_id: teacherId, kind: "phone", value: phone, verified: true, is_primary: true },
    { onConflict: "kind,value" },
  )

  return null
}
