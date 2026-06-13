"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentTeacherId } from "@/lib/supabase/teacher"
import { getTeacherAccess, ACCESS_MESSAGES } from "@/lib/supabase/access"
import { assembleReportContext } from "@/lib/reports/report-context"
import { generateReportContent } from "@/lib/reports/generate-report"
import { REPORT_PERIOD_OPTIONS, type ReportRow } from "@/lib/types/report"

export async function getReports(): Promise<{ data: ReportRow[] | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("generated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data as ReportRow[], error: null }
}

export async function getReport(id: string): Promise<{ data: ReportRow | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", teacherId)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  return { data: data as ReportRow | null, error: null }
}

/**
 * Generate a report for one student over a reporting period.
 *
 * The work is delegated to the multi-source pipeline: assembleReportContext()
 * gathers sessions + goals + documents + impairment profile, and
 * generateReportContent() synthesizes across all of them. This action only
 * handles authorization, period math, and persistence.
 *
 * Demo accounts cannot generate (samples-only — AI cost control); the demo
 * experience is the pre-seeded sample reports.
 */
export async function generateStudentReport(
  studentId: string,
  periodValue: string,
): Promise<{ data: ReportRow | null; error: string | null }> {
  const access = await getTeacherAccess()
  if (!access) return { data: null, error: "Not authenticated" }
  if (!access.canGenerateReports) {
    return {
      data: null,
      error: access.tier === "demo_expired" ? ACCESS_MESSAGES.demoExpired : ACCESS_MESSAGES.demoNoGenerate,
    }
  }

  const periodOption = REPORT_PERIOD_OPTIONS.find((p) => p.value === periodValue)
  if (!periodOption) return { data: null, error: "Unknown reporting period" }

  const end = new Date()
  const start = new Date(end.getTime() - periodOption.days * 24 * 60 * 60 * 1000)
  const period = {
    label: periodOption.label,
    start: start.toISOString(),
    end: end.toISOString(),
  }

  const { data: context, error: contextError } = await assembleReportContext({ studentId, period })
  if (contextError || !context) return { data: null, error: contextError ?? "Could not load student data" }

  const { data: content, error: genError } = await generateReportContent(context)
  if (genError || !content) return { data: null, error: genError ?? "Could not generate the report" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("reports")
    .insert({
      teacher_id: access.teacherId,
      student_id: studentId,
      period: periodOption.value,
      period_start: period.start.slice(0, 10),
      period_end: period.end.slice(0, 10),
      status: "ready",
      content,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as ReportRow, error: null }
}
