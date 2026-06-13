import { ReportsView } from "@/components/reports/reports-view"
import { getTeacherAccess } from "@/lib/supabase/access"

export default async function ReportsPage() {
  const access = await getTeacherAccess()

  // Capability subset is serialized to the client view; the report list itself
  // streams in client-side via the useReports hook (Realtime-backed).
  const capabilities = {
    canGenerateReports: access?.canGenerateReports ?? false,
    canExportReports: access?.canExportReports ?? false,
    isReadOnly: access?.isReadOnly ?? false,
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Progress and service reports, built from each student&apos;s sessions, goals, and documents.
        </p>
      </div>

      <ReportsView access={capabilities} />
    </div>
  )
}
