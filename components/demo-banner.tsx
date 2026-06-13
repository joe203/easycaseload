import Link from "next/link"
import { Clock, Lock } from "lucide-react"
import type { AccountTier } from "@/lib/types/teacher"

/**
 * Per-page demo status bar, rendered in the dashboard layout from
 * getTeacherAccess(). Active accounts see nothing. A live demo shows the
 * countdown; an expired demo shows the read-only state and points at plans.
 */
export function DemoBanner({
  tier,
  demoExpiresAt,
}: {
  tier: AccountTier
  demoExpiresAt: string | null
}) {
  if (tier === "active") return null

  if (tier === "demo_expired") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-destructive/30 bg-destructive/5 px-6 py-2.5">
        <p className="flex items-center gap-2 text-sm text-destructive">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            Your demo has ended — your workspace is now read-only. Subscribe to keep your data and unlock everything.
          </span>
        </p>
        <Link
          href="/app/billing"
          className="shrink-0 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
        >
          View plans
        </Link>
      </div>
    )
  }

  const daysLeft =
    demoExpiresAt != null
      ? Math.max(0, Math.ceil((new Date(demoExpiresAt).getTime() - Date.now()) / 86_400_000))
      : null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent/30 bg-accent/5 px-6 py-2.5">
      <p className="flex items-center gap-2 text-sm text-foreground">
        <Clock className="h-4 w-4 shrink-0 text-accent" />
        <span>
          You&apos;re exploring a demo workspace
          {daysLeft != null && (
            <>
              {" — "}
              <span className="font-medium">
                {daysLeft} day{daysLeft === 1 ? "" : "s"} left
              </span>
            </>
          )}
          . Sample data resets when you subscribe.
        </span>
      </p>
      <Link
        href="/app/billing"
        className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        Subscribe
      </Link>
    </div>
  )
}
