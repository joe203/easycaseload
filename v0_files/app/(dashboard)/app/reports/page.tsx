import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate and view caseload reports.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-base font-medium">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Caseload summaries, compliance reports, and service delivery analytics. This feature is under development.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
