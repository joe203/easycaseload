import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

export default function StudentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Students</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage your student caseload.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-base font-medium">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Your full student roster with IEP details, service logs, and progress tracking. This feature is under development.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
