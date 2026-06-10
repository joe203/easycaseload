"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Loader2 } from "lucide-react"

export function EarlyAccessSection() {
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const messageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (message?.type === "success") {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim()
    if (!formData.firstName.trim() || fullName.length < 2) {
      newErrors.firstName = "Please enter your name"
    }
    if (fullName.length > 100) {
      newErrors.firstName = "Name must be 100 characters or fewer"
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)

    if (!validate()) return

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
          email: formData.email.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ text: data.message, type: "success" })
        setFormData({ firstName: "", lastName: "", email: "" })
        setErrors({})
      } else {
        setMessage({ text: data.message || "Something went wrong. Please try again.", type: "error" })
      }
    } catch {
      setMessage({ text: "Something went wrong. Please try again.", type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="early-access" className="py-20 md:py-28">
      <div className="mx-auto w-[90%]">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Be the first to experience a simpler caseload system.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              {"We're inviting a limited number of professionals to join our early access group. Early participants will help shape features and receive priority onboarding when we launch."}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-12 flex flex-col gap-6 rounded-lg border border-border/60 bg-card p-8 shadow-sm"
            noValidate
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Jane"
                  required
                  minLength={2}
                  maxLength={100}
                  disabled={isSubmitting}
                  value={formData.firstName}
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value })
                    if (errors.firstName) setErrors({ ...errors, firstName: "" })
                  }}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                />
                {errors.firstName && (
                  <p id="firstName-error" className="text-sm text-destructive" role="alert">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Smith"
                  disabled={isSubmitting}
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jane@example.com"
                required
                disabled={isSubmitting}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  if (errors.email) setErrors({ ...errors, email: "" })
                }}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Request Early Access"
              )}
            </Button>

            {message && (
              <div
                ref={messageRef}
                role="status"
                aria-live="polite"
                className={`flex items-center gap-3 rounded-md p-4 text-sm ${
                  message.type === "success"
                    ? "border border-accent/30 bg-accent/5 text-accent"
                    : "border border-destructive/30 bg-destructive/5 text-destructive"
                }`}
              >
                {message.type === "success" && <CheckCircle2 className="h-5 w-5 shrink-0" />}
                {message.text}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              No spam. Just thoughtful updates as we build.
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
