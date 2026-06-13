// Report model.
//
// A report is NOT a transcription of a single session. It is a SYNTHESIS over
// several sources about one student across a reporting period:
//
//   1. session logs   — what happened in the room (student_logs)
//   2. IEP goals      — what we are measuring progress against (student_goals)
//   3. documentation  — IEPs / evaluations that frame the services (documents)
//   4. impairment     — the student's disability/service profile, which shapes
//      profile          tone, required sections, and applicable standards
//
// The generator (lib/reports/generate-report.ts) consumes the whole
// ReportContext. New sources are added by extending the context, never by
// rewriting the generator around one input. Source #4 is not yet a structured
// data source — it is a typed extension point (ImpairmentProfile) that the
// assembler leaves null until the data model lands.

export type ReportStatus = "draft" | "ready" | "sent"

export interface GoalProgressEntry {
  area: string | null
  goalText: string
  /** Narrative of progress toward this specific goal, drawn from the sessions. */
  progress: string
  status: "on_track" | "emerging" | "met" | "regressed" | "not_addressed"
}

/**
 * The persisted `reports.content` jsonb. Most fields are optional so the
 * hand-authored demo seed rows (title + summary + counts only) stay valid
 * alongside richer machine-generated reports.
 */
export interface ReportContent {
  title: string
  summary: string
  service_minutes?: number
  sessions_held?: number
  /** Full prose body produced by the multi-source generator. */
  narrative?: string
  goal_progress?: GoalProgressEntry[]
  recommendations?: string
  /** Which sources actually contributed — for auditability/transparency. */
  sources_used?: string[]
  /** Demo reports are watermarked and never exportable. */
  demo_watermark?: boolean
}

export interface ReportRow {
  id: string
  teacher_id: string
  student_id: string | null
  period: string | null
  period_start: string | null
  period_end: string | null
  status: ReportStatus
  content: ReportContent
  generated_at: string | null
  is_demo?: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ── Report generation inputs (the assembled context) ──────────────────────

export interface ReportStudentInput {
  id: string
  firstName: string | null
  lastName: string | null
  grade: string | null
  status: string
  notes: string | null
}

export interface ReportSessionInput {
  date: string | null
  serviceType: string | null
  durationMinutes: number | null
  performance: string | null
  participation: string | null
  summary: string | null
  notesRaw: string | null
}

export interface ReportGoalInput {
  id: string
  area: string | null
  goalText: string
  baseline: string | null
  target: string | null
  status: string
}

export interface ReportDocumentInput {
  id: string
  title: string | null
  docType: string | null
  description: string | null
  uploadedAt: string
}

/**
 * EXTENSION POINT — not yet modeled as structured data.
 *
 * A student's disability category and service context materially change what a
 * report must contain (e.g. an Orientation & Mobility report vs. a speech
 * fluency report cite different standards and progress measures). Until a
 * structured source exists, assembleReportContext sets this to null and the
 * generator adapts gracefully. When the data model lands, populate this here —
 * the generator already reads it.
 */
export interface ImpairmentProfile {
  categories: string[]
  serviceContext?: string | null
  notes?: string | null
}

export interface ReportPeriod {
  label: string
  start: string | null
  end: string | null
}

export interface ReportContext {
  student: ReportStudentInput
  period: ReportPeriod
  sessions: ReportSessionInput[]
  goals: ReportGoalInput[]
  documents: ReportDocumentInput[]
  impairmentProfile: ImpairmentProfile | null
  totals: { sessionsHeld: number; serviceMinutes: number }
}

export const REPORT_PERIOD_OPTIONS = [
  { value: "6wk", label: "6-week progress", days: 42 },
  { value: "9wk", label: "9-week progress", days: 63 },
  { value: "semester", label: "Semester summary", days: 120 },
] as const
