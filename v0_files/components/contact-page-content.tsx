"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2, Mail, MessageSquare, Lightbulb } from "lucide-react"

export function ContactPageContent() {
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
        setMessage({
          text: data.message || "Something went wrong. Please try again.",
          type: "error",
        })
      }
    } catch {
      setMessage({ text: "Something went wrong. Please try again.", type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Hero banner */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/contact-bg.jpg)" }}
        />
        <div className="absolute inset-0 bg-[#2d3a4a]/80" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

        <div className="relative mx-auto w-[90%] text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            {"We'd Love to Hear From You"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-white/80 md:text-xl">
            Whether you have a question, a suggestion, or just want to connect --
            your message goes straight to the team building EasyCaseload.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20">
        <div className="mx-auto w-[90%]">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-5">
            {/* Left column -- reasons to reach out */}
            <div className="flex flex-col gap-8 lg:col-span-2">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  What can you reach out about?
                </h2>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                  Anything at all. Seriously. Here are a few ideas:
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                    <MessageSquare className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Questions about the project</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Curious about what we are building or when it will be ready? Ask away.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                    <Lightbulb className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Feature ideas or suggestions</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Have a pain point you wish someone would solve? Tell us. It might become a feature.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                    <Mail className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Partnership or collaboration</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Interested in working together or helping shape the product? We are all ears.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-secondary/50 p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Real people read every message.</span>{" "}
                  We are a small team building this because we believe itinerant professionals
                  deserve better tools. Your message matters to us.
                </p>
              </div>
            </div>

            {/* Right column -- form */}
            <div className="lg:col-span-3">
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-6 rounded-lg border border-border/60 bg-card p-8 shadow-sm"
                noValidate
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="contactPageName">Name</Label>
                  <Input
                    id="contactPageName"
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
                    aria-describedby={errors.name ? "contactPageName-error" : undefined}
                  />
                  {errors.name && (
                    <p id="contactPageName-error" className="text-sm text-destructive" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="contactPageEmail">Email</Label>
                  <Input
                    id="contactPageEmail"
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
                    aria-describedby={errors.email ? "contactPageEmail-error" : undefined}
                  />
                  {errors.email && (
                    <p id="contactPageEmail-error" className="text-sm text-destructive" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="contactPageMessage">Message</Label>
                  <Textarea
                    id="contactPageMessage"
                    name="message"
                    placeholder="What would you like to know, share, or suggest?"
                    rows={5}
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
                    aria-describedby={errors.message ? "contactPageMessage-error" : undefined}
                  />
                  {errors.message && (
                    <p id="contactPageMessage-error" className="text-sm text-destructive" role="alert">
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
        </div>
      </section>
    </>
  )
}
