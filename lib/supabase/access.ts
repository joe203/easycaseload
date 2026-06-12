import { getCurrentTeacher } from "@/lib/supabase/teacher"
import type { AccountTier, Teacher } from "@/lib/types/teacher"

/**
 * The single source of truth for what an account can do (V2 capability model).
 * Every server action and every UI lock/badge derives from this object —
 * subscription activation is one status flip, nothing else changes.
 *
 * Demo caps mirror the DB triggers in migration 018 (defense in depth):
 * the trigger is the hard wall, this layer gives friendly errors first.
 */
export interface TeacherAccess {
  teacherId: string
  teacher: Teacher
  tier: AccountTier
  canUploadDocuments: boolean
  canExportReports: boolean
  canSendComms: boolean
  /** null = unlimited */
  maxStudents: number | null
  /** null = unlimited */
  maxSchools: number | null
  demoExpiresAt: string | null
}

const DEMO_CAPS = { maxStudents: 4, maxSchools: 2 } as const

function resolveTier(teacher: Teacher): AccountTier {
  // Defaults to 'active' if the column is absent (app deployed before
  // migration 018) — fail open for existing accounts, never lock them out.
  const status = teacher.account_status ?? "active"
  // Server-side expiry enforcement: an overdue demo is expired at request time,
  // even before the nightly job flips the row.
  if (
    status === "demo" &&
    teacher.demo_expires_at &&
    new Date(teacher.demo_expires_at).getTime() < Date.now()
  ) {
    return "demo_expired"
  }
  return status
}

export function buildAccess(teacher: Teacher): TeacherAccess {
  const tier = resolveTier(teacher)
  const isActive = tier === "active"
  return {
    teacherId: teacher.id,
    teacher,
    tier,
    canUploadDocuments: isActive,
    canExportReports: isActive,
    canSendComms: isActive,
    maxStudents: isActive ? null : DEMO_CAPS.maxStudents,
    maxSchools: isActive ? null : DEMO_CAPS.maxSchools,
    demoExpiresAt: teacher.demo_expires_at,
  }
}

/** Resolve capabilities for the currently authenticated teacher. */
export async function getTeacherAccess(): Promise<TeacherAccess | null> {
  const teacher = await getCurrentTeacher()
  if (!teacher) return null
  return buildAccess(teacher)
}

/** Shared user-facing messages for gated actions. */
export const ACCESS_MESSAGES = {
  demoExpired: "Your demo has ended. Subscribe to keep using EasyCaseload.",
  demoNoUploads: "Document uploads are available after you subscribe.",
  demoStudentCap: "Demo accounts can add one practice student. Subscribe for your full caseload.",
  demoSchoolCap: "Demo accounts use the included demo schools. Subscribe to add your own.",
} as const
