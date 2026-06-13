"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  BarChart3,
  Download,
  FileText,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useReports } from "@/hooks/useReports"
import { useStudents } from "@/hooks/useStudents"
import { generateStudentReport } from "@/lib/actions/reports"
import { REPORT_PERIOD_OPTIONS, type ReportRow } from "@/lib/types/report"

interface ReportsAccess {
  canGenerateReports: boolean
  canExportReports: boolean
  isReadOnly: boolean
}

export function ReportsView({ access }: { access: ReportsAccess }) {
  const { data: reports, isLoading } = useReports()
  const { data: students } = useStudents()
  const queryClient = useQueryClient()

  const [studentId, setStudentId] = useState("")
  const [period, setPeriod] = useState<string>(REPORT_PERIOD_OPTIONS[0].value)
  const [error, setError] = useState<string | null>(null)

  const generate = useMutation({
    mutationFn: async () => {
      setError(null)
      const res = await generateStudentReport(studentId, period)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not generate the report"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  })

  return (
    <div className="flex flex-col gap-6">
      {access.canGenerateReports ? (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Generate a report</CardTitle>
            <p className="text-xs text-muted-foreground">
              EasyCaseload builds the report from the student&apos;s sessions, goals, and documents over the period you choose.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Select a student…</option>
                {(students ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {[s.first_name, s.last_name].filter(Boolean).join(" ") || "Unnamed student"}
                  </option>
                ))}
              </select>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm sm:w-56"
              >
                {REPORT_PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => generate.mutate()}
                disabled={!studentId || generate.isPending}
                className="gap-2"
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="flex flex-col items-start gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <Lock className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {access.isReadOnly ? "Your demo has ended" : "Sample reports are below"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Subscribe to generate reports from your own students&apos; sessions, goals, and documents.
                </p>
              </div>
            </div>
            <Button asChild variant="default" className="shrink-0">
              <Link href="/app/billing">View plans</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reports…</p>
      ) : (reports ?? []).length === 0 ? (
        <Card className="border-border/60">
          <CardHeader className="pb-2 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base font-medium">No reports yet</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
              Generate a report above and it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {(reports ?? []).map((report) => (
            <ReportCard key={report.id} report={report} canExport={access.canExportReports} />
          ))}
        </div>
      )}
    </div>
  )
}

const GOAL_STATUS_LABELS: Record<string, string> = {
  on_track: "On track",
  emerging: "Emerging",
  met: "Met",
  regressed: "Regressed",
  not_addressed: "Not addressed",
}

function ReportCard({ report, canExport }: { report: ReportRow; canExport: boolean }) {
  const { content } = report
  const isDemo = content.demo_watermark === true

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-medium leading-snug">{content.title}</CardTitle>
              {report.period_start && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {report.period_start} – {report.period_end ?? "present"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDemo && (
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                Demo sample
              </span>
            )}
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
              {report.status}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-foreground">{content.summary}</p>

        {(content.service_minutes != null || content.sessions_held != null) && (
          <div className="flex gap-3">
            {content.service_minutes != null && (
              <Stat label="Service minutes" value={content.service_minutes} />
            )}
            {content.sessions_held != null && (
              <Stat label="Sessions held" value={content.sessions_held} />
            )}
          </div>
        )}

        {content.goal_progress && content.goal_progress.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Goal progress</p>
            {content.goal_progress.map((goal, i) => (
              <div key={i} className="rounded-md border border-border/50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{goal.area ?? "Goal"}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {GOAL_STATUS_LABELS[goal.status] ?? goal.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{goal.progress}</p>
              </div>
            ))}
          </div>
        )}

        {content.narrative && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-accent hover:underline">
              Read full report
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {content.narrative}
            </p>
            {content.recommendations && (
              <div className="mt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommendations</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {content.recommendations}
                </p>
              </div>
            )}
          </details>
        )}

        <div className="flex items-center gap-2 border-t border-border/50 pt-3">
          {canExport ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => exportReport(report)}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              title="Export is available with a subscription"
            >
              <Link href="/app/billing">
                <Lock className="h-3.5 w-3.5" />
                Export — subscribe to unlock
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-md bg-muted/60 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

// Plain-text export — a dependency-free download so "Export" does something real
// for subscribers. A formatted PDF export is a later phase.
function exportReport(report: ReportRow) {
  const { content } = report
  const lines = [content.title, "", content.summary, ""]
  if (content.narrative) lines.push(content.narrative, "")
  if (content.goal_progress?.length) {
    lines.push("GOAL PROGRESS")
    for (const g of content.goal_progress) {
      lines.push(`- ${g.area ?? "Goal"} [${g.status}]: ${g.progress}`)
    }
    lines.push("")
  }
  if (content.recommendations) lines.push("RECOMMENDATIONS", content.recommendations)

  const blob = new Blob([lines.join("\n")], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${content.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
