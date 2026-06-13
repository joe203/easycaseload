import "server-only"
import { anthropic } from "@ai-sdk/anthropic"
import { generateObject } from "ai"
import { z } from "zod"
import type { ReportContent, ReportContext } from "@/lib/types/report"

// The model writes the prose and the per-goal judgements; it does NOT invent
// counts. service_minutes / sessions_held are computed from the source rows and
// merged in after generation, so the numbers in a report are always real.
const generatedSchema = z.object({
  title: z.string().describe("Report title, e.g. 'Six-Week Progress Report — Maria Hernandez'"),
  summary: z.string().describe("2-4 sentence executive summary for a parent or supervisor"),
  narrative: z.string().describe("The full report body in clear, professional prose"),
  goal_progress: z
    .array(
      z.object({
        area: z.string().nullable(),
        goalText: z.string(),
        progress: z.string().describe("Evidence of progress toward this goal, citing session activity"),
        status: z.enum(["on_track", "emerging", "met", "regressed", "not_addressed"]),
      }),
    )
    .describe("One entry per IEP goal provided. If no sessions addressed a goal, mark it not_addressed."),
  recommendations: z.string().describe("Next steps / recommendations for the coming period"),
})

/**
 * Synthesize a report from the full multi-source context.
 *
 * The report is composed across sessions + goals + documents + impairment
 * profile — never from a single session. The generator degrades gracefully
 * when a source is empty (no goals, no documents, no profile) and records which
 * sources actually contributed in `sources_used` for transparency.
 */
export async function generateReportContent(
  context: ReportContext,
  opts: { watermark?: boolean } = {},
): Promise<{ data: ReportContent | null; error: string | null }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { data: null, error: "Report generation is not configured" }
  }
  if (context.sessions.length === 0 && context.goals.length === 0) {
    return {
      data: null,
      error: "Not enough information yet — log a session or add a goal for this student first.",
    }
  }

  const sourcesUsed: string[] = []
  if (context.sessions.length) sourcesUsed.push("session logs")
  if (context.goals.length) sourcesUsed.push("IEP goals")
  if (context.documents.length) sourcesUsed.push("documentation")
  if (context.impairmentProfile) sourcesUsed.push("impairment profile")

  try {
    const { object } = await generateObject({
      // Sonnet for report synthesis (CLAUDE.md §9 — Haiku for chat, Sonnet for
      // report generation / complex processing).
      model: anthropic("claude-sonnet-4-6"),
      schema: generatedSchema,
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(context),
    })

    const content: ReportContent = {
      ...object,
      // Real numbers, computed from the source rows — not model output.
      service_minutes: context.totals.serviceMinutes,
      sessions_held: context.totals.sessionsHeld,
      sources_used: sourcesUsed,
      demo_watermark: opts.watermark ?? false,
    }
    return { data: content, error: null }
  } catch {
    return { data: null, error: "Could not generate the report — please try again." }
  }
}

const SYSTEM_PROMPT = `You are an experienced itinerant special-education teacher writing a service/progress report.

A report is a SYNTHESIS across multiple sources about one student over a reporting period — not a retelling of a single session. You are given:
- session logs (what happened across the period),
- IEP goals (what progress must be measured against),
- supporting documentation (IEPs/evaluations that frame the services),
- and, when available, the student's impairment profile (which shapes tone and which standards apply).

Write for a parent or supervisor: clear, professional, specific, and free of jargon where plain language works. Ground every claim in the session evidence provided. Measure each goal explicitly. If a source is missing or thin, say what is known and avoid inventing detail. Never fabricate numbers, dates, or assessment scores that are not in the inputs.`

function buildPrompt(context: ReportContext): string {
  const { student, period, sessions, goals, documents, impairmentProfile, totals } = context
  const name = [student.firstName, student.lastName].filter(Boolean).join(" ") || "the student"
  const lines: string[] = []

  lines.push(`STUDENT: ${name}${student.grade ? `, grade ${student.grade}` : ""}`)
  lines.push(`REPORTING PERIOD: ${period.label}${period.start ? ` (${period.start} to ${period.end ?? "present"})` : ""}`)
  if (student.notes) lines.push(`STUDENT NOTES: ${student.notes}`)

  lines.push("")
  lines.push(
    impairmentProfile
      ? `IMPAIRMENT PROFILE: ${impairmentProfile.categories.join(", ")}${impairmentProfile.serviceContext ? ` — ${impairmentProfile.serviceContext}` : ""}`
      : "IMPAIRMENT PROFILE: not on file — keep the report general to the services delivered.",
  )

  lines.push("")
  lines.push(`IEP GOALS (${goals.length}):`)
  if (goals.length === 0) {
    lines.push("  (none recorded — base the report on session activity and note that no goals are on file)")
  } else {
    for (const g of goals) {
      lines.push(
        `  - [${g.area ?? "general"}] ${g.goalText}` +
          `${g.baseline ? ` | baseline: ${g.baseline}` : ""}${g.target ? ` | target: ${g.target}` : ""} | status: ${g.status}`,
      )
    }
  }

  lines.push("")
  lines.push(`SESSION LOGS (${sessions.length}, ${totals.serviceMinutes} service minutes, ${totals.sessionsHeld} sessions held):`)
  if (sessions.length === 0) {
    lines.push("  (no sessions in this period)")
  } else {
    for (const s of sessions) {
      const date = s.date ? new Date(s.date).toISOString().slice(0, 10) : "undated"
      lines.push(
        `  - ${date} | ${s.serviceType ?? "service"} | ${s.durationMinutes ?? "?"} min | ${s.participation ?? "?"} | ${s.performance ?? "n/a"}`,
      )
      if (s.summary) lines.push(`      ${s.summary}`)
      else if (s.notesRaw) lines.push(`      ${s.notesRaw}`)
    }
  }

  lines.push("")
  lines.push(`SUPPORTING DOCUMENTS (${documents.length}):`)
  if (documents.length === 0) {
    lines.push("  (none attached)")
  } else {
    for (const d of documents) {
      lines.push(`  - ${d.docType ?? "document"}: ${d.title ?? d.id}${d.description ? ` — ${d.description}` : ""}`)
    }
  }

  lines.push("")
  lines.push(
    "Write the report now. Cover each goal, summarize the period's services, and give recommendations for the next period.",
  )
  return lines.join("\n")
}
