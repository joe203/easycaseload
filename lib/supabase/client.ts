import { createBrowserClient } from '@supabase/ssr'

// Supports the new publishable key (sb_publishable_…) with a fallback to the
// legacy anon key, so either env var name works.
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    PUBLISHABLE_KEY!,
  )
}
