import { createClient } from "@/lib/supabase/server"
import type { Teacher } from "@/lib/types/teacher"

/**
 * Resolve the teacher record for the currently authenticated user.
 * Teacher rows are keyed by auth_user_id (which may be null for pre-auth,
 * Savannah-created teachers). RLS ensures a user only ever sees their own row.
 */
export async function getCurrentTeacher(): Promise<Teacher | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("teachers")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  return (data as Teacher | null) ?? null
}

/** Convenience: just the teacher's id, or null if not authenticated/linked. */
export async function getCurrentTeacherId(): Promise<string | null> {
  const teacher = await getCurrentTeacher()
  return teacher?.id ?? null
}
