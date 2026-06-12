"use server"

import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { maskPhone } from "@/lib/phone"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface RegistrationContext {
  valid: boolean
  reason?: "invalid" | "expired" | "used" | "already_registered"
  phoneMasked?: string
}

// Matches the n8n inbound workflow: sha256 hex of the raw token. Only the
// hash is stored; the raw token exists only in the SMS link.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

interface TokenRow {
  id: string
  teacher_id: string
  expires_at: string
  used_at: string | null
}

async function lookupToken(admin: SupabaseClient, token: string): Promise<TokenRow | null> {
  const { data } = await admin
    .from("registration_tokens")
    .select("id, teacher_id, expires_at, used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle()
  return (data as TokenRow | null) ?? null
}

/** Validate a registration link for the /register page (server component). */
export async function getRegistrationContext(token: string): Promise<RegistrationContext> {
  if (!token || token.length < 16) return { valid: false, reason: "invalid" }

  const admin = createAdminClient()
  const row = await lookupToken(admin, token)
  if (!row) return { valid: false, reason: "invalid" }
  if (row.used_at) return { valid: false, reason: "used" }
  if (new Date(row.expires_at).getTime() < Date.now()) return { valid: false, reason: "expired" }

  const { data: teacher } = await admin
    .from("teachers")
    .select("id, phone, auth_user_id")
    .eq("id", row.teacher_id)
    .maybeSingle()

  if (!teacher?.phone) return { valid: false, reason: "invalid" }
  if (teacher.auth_user_id) return { valid: false, reason: "already_registered" }

  return { valid: true, phoneMasked: maskPhone(teacher.phone) }
}

/**
 * Redeem an SMS registration token: claim the pre-existing teacher row with
 * the submitted name + email. Writing teachers.email here IS the link — when
 * the teacher verifies that email via the magic link, the signup trigger
 * (migration 016) matches teachers.email and attaches the new login to this
 * exact row, phone and SMS history included. Deterministic; no email-matching
 * heuristics, no merge_pending.
 */
export async function completeSmsRegistration(
  token: string,
  fullName: string,
  email: string,
): Promise<{ error: string | null }> {
  const name = fullName.trim()
  const normalizedEmail = email.trim().toLowerCase()
  if (!name) return { error: "Enter your name" }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { error: "Enter a valid email address" }
  }

  const admin = createAdminClient()
  const row = await lookupToken(admin, token)
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    return { error: "This link is no longer valid. Start fresh at easycaseload.com/signup." }
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select("id, phone, auth_user_id")
    .eq("id", row.teacher_id)
    .maybeSingle()

  if (!teacher?.phone) return { error: "This link is no longer valid. Start fresh at easycaseload.com/signup." }
  if (teacher.auth_user_id) return { error: "This account is already set up — sign in instead." }

  const { error: updateError } = await admin
    .from("teachers")
    .update({
      full_name: name,
      email: normalizedEmail,
      status: "invited",
      // They texted in from this number — ownership is already proven.
      phone_verified: true,
    })
    .eq("id", teacher.id)

  if (updateError) {
    if (updateError.code === "23505") return { error: "That email is already in use — sign in instead." }
    return { error: "Something went wrong — try again." }
  }

  await admin.from("teacher_identities").upsert(
    { teacher_id: teacher.id, kind: "phone", value: teacher.phone, verified: true, is_primary: true },
    { onConflict: "kind,value" },
  )

  await admin
    .from("registration_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)

  return { error: null }
}
