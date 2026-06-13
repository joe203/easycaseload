import { createClient } from "@/lib/supabase/server"
import { getCurrentTeacherId } from "@/lib/supabase/teacher"
import type {
  ReportContext,
  ReportPeriod,
  ImpairmentProfile,
} from "@/lib/types/report"

interface AssembleParams {
  studentId: string
  period: ReportPeriod
}

/**
 * Gather everything a report draws on for one student over a reporting period.
 *
 * This is the seam the whole report feature is built around: it pulls from
 * EVERY contributing source (sessions, goals, documents, impairment profile)
 * and hands the generator a single ReportContext. Adding a new source means
 * extending this function and the ReportContext type — the generator does not
 * change. Reads go through the RLS user client, so a teacher can only ever
 * assemble context from their own caseload.
 */
export async function assembleReportContext({
  studentId,
  period,
}: AssembleParams): Promise<{ data: ReportContext | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: "Not authenticated" }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, first_name, last_name, grade, status, notes, metadata")
    .eq("id", studentId)
    .eq("teacher_id", teacherId)
    .maybeSingle()

  if (studentError) return { data: null, error: studentError.message }
  if (!student) return { data: null, error: "Student not found" }

  // Source 1 — session activity within the reporting window.
  let sessionQuery = supabase
    .from("student_logs")
    .select(
      "session_date, service_type, duration_minutes, performance_summary, participation, summary, notes_raw",
    )
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .order("session_date", { ascending: true })
  if (period.start) sessionQuery = sessionQuery.gte("session_date", period.start)
  if (period.end) sessionQuery = sessionQuery.lte("session_date", period.end)
  const { data: logs, error: logsError } = await sessionQuery
  if (logsError) return { data: null, error: logsError.message }

  // Source 2 — the IEP goals this report measures progress against.
  const { data: goals, error: goalsError } = await supabase
    .from("student_goals")
    .select("id, area, goal_text, baseline, target, status")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: true })
  if (goalsError) return { data: null, error: goalsError.message }

  // Source 3 — supporting documentation (IEPs, evaluations). Metadata only for
  // now; document text extraction is a later phase, but the report already
  // knows which documents frame the student's services.
  const { data: documents, error: docsError } = await supabase
    .from("documents")
    .select("id, title, doc_type, description, uploaded_at")
    .eq("teacher_id", teacherId)
    .eq("entity_type", "student")
    .eq("entity_id", studentId)
    .order("uploaded_at", { ascending: false })
  if (docsError) return { data: null, error: docsError.message }

  const sessions = (logs ?? []).map((l) => ({
    date: l.session_date,
    serviceType: l.service_type,
    durationMinutes: l.duration_minutes,
    performance: l.performance_summary,
    participation: l.participation,
    summary: l.summary,
    notesRaw: l.notes_raw,
  }))

  const totals = {
    sessionsHeld: sessions.filter((s) => s.participation !== "absent").length,
    serviceMinutes: sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0),
  }

  return {
    data: {
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        grade: student.grade,
        status: student.status,
        notes: student.notes,
      },
      period,
      sessions,
      goals: (goals ?? []).map((g) => ({
        id: g.id,
        area: g.area,
        goalText: g.goal_text,
        baseline: g.baseline,
        target: g.target,
        status: g.status,
      })),
      documents: (documents ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        docType: d.doc_type,
        description: d.description,
        uploadedAt: d.uploaded_at,
      })),
      impairmentProfile: readImpairmentProfile(student.metadata),
      totals,
    },
    error: null,
  }
}

/**
 * Forward-compatible read of the impairment profile. Today there is no
 * structured impairment source, so this returns null unless a teacher's data
 * already carries a hint under students.metadata.impairment. When the real
 * data model arrives, replace this read — every caller already handles a
 * populated profile.
 */
function readImpairmentProfile(
  metadata: Record<string, unknown> | null | undefined,
): ImpairmentProfile | null {
  const raw = metadata?.["impairment"]
  if (!raw || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  const categories = Array.isArray(obj.categories)
    ? obj.categories.filter((c): c is string => typeof c === "string")
    : []
  if (categories.length === 0) return null
  return {
    categories,
    serviceContext: typeof obj.serviceContext === "string" ? obj.serviceContext : null,
    notes: typeof obj.notes === "string" ? obj.notes : null,
  }
}
