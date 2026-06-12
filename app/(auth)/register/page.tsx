import { getRegistrationContext } from "@/lib/actions/registration"
import { RegisterForm } from "@/components/register-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Landing page for SMS registration links: /register?t=<token>. The token was
// texted to a teacher who messaged the EasyCaseload number; it resolves to
// their pre-existing teacher row (phone already proven).

const INVALID_COPY: Record<string, { title: string; body: string }> = {
  invalid: {
    title: "This link isn't valid",
    body: "The registration link may have been mistyped or cut off. You can still sign up the regular way — it only takes a minute.",
  },
  expired: {
    title: "This link has expired",
    body: "Registration links are valid for 7 days. Text us again for a fresh link, or sign up the regular way.",
  },
  used: {
    title: "This link was already used",
    body: "Looks like setup already started with this link. If that was you, check your email for the sign-in link — or sign in directly.",
  },
  already_registered: {
    title: "You're already set up",
    body: "This number is already connected to an EasyCaseload account. Just sign in.",
  },
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>
}) {
  const { t } = await searchParams
  let ctx: Awaited<ReturnType<typeof getRegistrationContext>> = {
    valid: false,
    reason: "invalid",
  }
  if (t) {
    try {
      ctx = await getRegistrationContext(t)
    } catch {
      // Misconfigured server key must not 500 a public page — degrade to the
      // invalid-link card, which routes the teacher to normal signup.
    }
  }

  if (!ctx.valid || !t) {
    const copy = INVALID_COPY[ctx.reason ?? "invalid"]
    const signIn = ctx.reason === "used" || ctx.reason === "already_registered"
    return (
      <div className="w-full max-w-sm">
        <Card className="border-border/60">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">{copy.title}</CardTitle>
            <CardDescription>{copy.body}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href={signIn ? "/signin" : "/signup"}>
                {signIn ? "Sign in" : "Sign up"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <RegisterForm token={t} phoneMasked={ctx.phoneMasked!} />
}
