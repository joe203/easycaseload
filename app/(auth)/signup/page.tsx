"use client"

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
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignUpPage() {
  // Primary path: email-only magic link → lands in Savannah onboarding.
  const [email, setEmail] = useState("")
  const [linkSent, setLinkSent] = useState(false)
  const [isLinkLoading, setIsLinkLoading] = useState(false)

  // Secondary path: traditional password signup.
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    const supabase = createClient()
    setIsLinkLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent("/app/onboarding")}`,
          data: {
            app: "easycaseload",
          },
        },
      })
      if (error) throw error
      setLinkSent(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLinkLoading(false)
    }
  }

  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/app/onboarding`,
          data: {
            full_name: fullName,
            app: "easycaseload",
          },
        },
      })
      if (error) throw error
      router.push("/signup/success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Card className="border-border/60">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Get started</CardTitle>
          <CardDescription>
            Type your email, click the link we send you, and start talking.
            That&apos;s the whole signup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {linkSent ? (
              <div className="rounded-md bg-accent/10 p-4 text-center text-sm">
                <p className="font-medium text-foreground">Check your inbox</p>
                <p className="mt-1 text-muted-foreground">
                  We sent a sign-in link to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  Click it and Savannah will get you set up.
                </p>
              </div>
            ) : (
              <form onSubmit={handleMagicLink}>
                <div className="flex flex-col gap-4">
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
                  {error && !showPassword && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLinkLoading}
                  >
                    {isLinkLoading ? "Sending link..." : "Send me a sign-in link"}
                  </Button>
                </div>
              </form>
            )}

            {!linkSent && (
              <>
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <Separator className="flex-1" />
                </div>

                {!showPassword ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPassword(true)}
                  >
                    Sign up with a password instead
                  </Button>
                ) : (
                  <form onSubmit={handlePasswordSignUp}>
                    <div className="flex flex-col gap-4">
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
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirm password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                      {error && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Create account"}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
