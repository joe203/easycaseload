"use client"

import { completeSmsRegistration } from "@/lib/actions/registration"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

export function RegisterForm({
  token,
  phoneMasked,
}: {
  token: string
  phoneMasked: string
}) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [linkSent, setLinkSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Claim the teacher row first (server-side, token-validated)…
    const { error: claimError } = await completeSmsRegistration(token, fullName, email)
    if (claimError) {
      setError(claimError)
      setIsLoading(false)
      return
    }

    // …then send the magic link. Verifying the email links the new login to
    // that same teacher row via the signup trigger.
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent("/app/onboarding")}`,
        data: {
          app: "easycaseload",
          full_name: fullName.trim(),
        },
      },
    })
    setIsLoading(false)
    if (otpError) {
      setError(otpError.message)
      return
    }
    setLinkSent(true)
  }

  return (
    <div className="w-full max-w-sm">
      <Card className="border-border/60">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Finish setting up</CardTitle>
          <CardDescription>
            {linkSent
              ? "One more step."
              : `We have your number ${phoneMasked} from your text. Add your name and email and you're in.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkSent ? (
            <div className="rounded-md bg-accent/10 p-4 text-center text-sm">
              <p className="font-medium text-foreground">Check your inbox</p>
              <p className="mt-1 text-muted-foreground">
                We sent a sign-in link to{" "}
                <span className="font-medium text-foreground">{email}</span>. Click
                it to finish — your account and texts will be waiting.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone-display">Mobile number</Label>
                  <Input id="phone-display" value={phoneMasked} disabled readOnly />
                  <p className="text-xs text-muted-foreground">
                    Verified — you texted us from it.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Jane Smith"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Setting up..." : "Create my account"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
