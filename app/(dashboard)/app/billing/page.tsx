import Link from "next/link"
import { Check, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTeacherAccess } from "@/lib/supabase/access"

// Sample pricing — final plans and live checkout (Stripe) land in Phase D.
// Until then the CTA routes to contact so an expired-demo teacher is never
// dead-ended. Do not wire real payment here.
const PLANS = [
  {
    name: "Monthly",
    price: "$12",
    cadence: "/month",
    note: "Billed monthly. Cancel anytime.",
    featured: false,
  },
  {
    name: "Annual",
    price: "$120",
    cadence: "/year",
    note: "Two months free vs. monthly.",
    featured: true,
  },
] as const

const FEATURES = [
  "Your full caseload — unlimited students and schools",
  "Session logging with document uploads (IEPs, evaluations)",
  "AI progress & service reports from your own data",
  "Export and share reports",
  "Capture sessions by text message",
]

export default async function BillingPage() {
  const access = await getTeacherAccess()
  const tier = access?.tier ?? "active"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tier === "demo_expired"
            ? "Your demo has ended. Subscribe to keep your workspace and unlock everything."
            : tier === "demo"
              ? "You're on a free demo. Subscribe any time to switch to your real caseload."
              : "Manage your EasyCaseload subscription."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={plan.featured ? "border-accent/60 ring-1 ring-accent/30" : "border-border/60"}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">{plan.name}</CardTitle>
                {plan.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                    <Sparkles className="h-3 w-3" />
                    Best value
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.cadence}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{plan.note}</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ul className="flex flex-col gap-2">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/contact?plan=${plan.name.toLowerCase()}`}
                className={
                  plan.featured
                    ? "inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                    : "inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                }
              >
                Get {plan.name}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Sample pricing — final plans are being confirmed. Online checkout is coming soon; for now,{" "}
        <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">
          contact us
        </Link>{" "}
        to subscribe and we&apos;ll set you up.
      </p>
    </div>
  )
}
