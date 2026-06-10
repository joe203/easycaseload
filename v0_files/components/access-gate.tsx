import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Clock, ShieldX } from "lucide-react"

interface AccessGateProps {
  status?: string
}

export function AccessGate({ status = "none" }: AccessGateProps) {
  const isRevoked = status === "revoked"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-border/60 text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {isRevoked ? (
              <ShieldX className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Clock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <CardTitle className="text-xl font-semibold text-balance">
            {isRevoked ? "Access revoked" : "You are not yet invited"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs text-pretty">
            {isRevoked
              ? "Your access to EasyCaseload has been revoked. If you believe this is an error, please contact us."
              : "EasyCaseload is currently in early access. When your account is approved, you will be able to access the app from here."}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Back to homepage</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
