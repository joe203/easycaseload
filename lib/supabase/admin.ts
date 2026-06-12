import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role client — bypasses RLS. For server-side flows whose tables are
 * deny-all (phone_verifications, registration_tokens) and for trusted writes
 * onto teacher rows the current user doesn't own yet (registration linking).
 * Never import from a client component; SUPABASE_SECRET_KEY must never reach
 * the browser.
 */
export function createAdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not configured")

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
