"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2 } from "lucide-react"

export function ContactSection() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" })
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

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = "Please enter your name"
    }
    if (formData.name.trim().length > 100) {
      newErrors.name = "Name must be 100 characters or fewer"
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      newErrors.message = "Please enter a message (at least 10 characters)"
    }
    if (formData.message.trim().length > 1000) {
      newErrors.message = "Message must be 1000 characters or fewer"
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
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          message: formData.message.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ text: data.message, type: "success" })
        setFormData({ name: "", email: "", message: "" })
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
    <section id="contact" className="bg-card py-20 md:py-28">
      <div className="mx-auto w-[90%]">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {"Have a question about what we're building?"}
            </h2>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-12 flex flex-col gap-6 rounded-lg border border-border/60 bg-background p-8 shadow-sm"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="contactName">Name</Label>
              <Input
                id="contactName"
                name="name"
                placeholder="Your name"
                required
                minLength={2}
                maxLength={100}
                disabled={isSubmitting}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: "" })
                }}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "contactName-error" : undefined}
              />
              {errors.name && (
                <p id="contactName-error" className="text-sm text-destructive" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                disabled={isSubmitting}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  if (errors.email) setErrors({ ...errors, email: "" })
                }}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "contactEmail-error" : undefined}
              />
              {errors.email && (
                <p id="contactEmail-error" className="text-sm text-destructive" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contactMessage">Message</Label>
              <Textarea
                id="contactMessage"
                name="message"
                placeholder="What would you like to know?"
                rows={4}
                required
                minLength={10}
                maxLength={1000}
                disabled={isSubmitting}
                value={formData.message}
                onChange={(e) => {
                  setFormData({ ...formData, message: e.target.value })
                  if (errors.message) setErrors({ ...errors, message: "" })
                }}
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? "contactMessage-error" : undefined}
              />
              {errors.message && (
                <p id="contactMessage-error" className="text-sm text-destructive" role="alert">
                  {errors.message}
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
                "Send Message"
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
          </form>
        </div>
      </div>
    </section>
  )
}
