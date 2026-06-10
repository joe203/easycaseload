"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { CheckCircle2, Loader2, ArrowRight, ArrowLeft, ClipboardList, Clock, MessageSquare, Shield } from "lucide-react"

const REALITY_OPTIONS = [
  "I don't have enough time.",
  "There aren't enough of us to cover the caseload.",
  "Paperwork takes over my evenings.",
  "I'm in the car more than I'm with students.",
  "Certain times of the year feel impossible.",
  "I feel like I'm constantly trying to perfect everything.",
  "I feel organized and on top of things.",
]

const EARLY_ACCESS_OPTIONS = [
  "Yes -- I'd love to see it.",
  "Maybe -- depends on what it does.",
  "Probably not right now.",
]

const TEST_OPTIONS = ["Yes", "Maybe", "Not at this time"]

interface SurveyData {
  q1_reality: string[]
  q2_overwhelm: number
  q3_remove: string
  q4_no_stress: string
  q5_must_do: string
  q6_dealbreaker: string
  q7_early_access: string
  q8_willing_to_test: string
  q9_email: string
}

const initialData: SurveyData = {
  q1_reality: [],
  q2_overwhelm: 5,
  q3_remove: "",
  q4_no_stress: "",
  q5_must_do: "",
  q6_dealbreaker: "",
  q7_early_access: "",
  q8_willing_to_test: "",
  q9_email: "",
}

export function SurveyContent() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<SurveyData>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const messageRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (message?.type === "success") {
      const timer = setTimeout(() => setMessage(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [message])

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [step])

  function validateSection(section: number): boolean {
    const newErrors: Record<string, string> = {}

    if (section === 1) {
      if (data.q1_reality.length === 0) {
        newErrors.q1 = "Please select at least one option."
      }
      if (data.q1_reality.length > 2) {
        newErrors.q1 = "Please select up to 2 options."
      }
      // Q3 open response: allow empty strings per spec
    }

    if (section === 2) {
      // Q4-Q6 open responses: allow empty strings per spec
    }

    if (section === 3) {
      if (!data.q7_early_access) {
        newErrors.q7 = "Please select an option."
      }
      if (!data.q8_willing_to_test) {
        newErrors.q8 = "Please select an option."
      }
      if (
        data.q9_email.trim().length > 0 &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.q9_email.trim())
      ) {
        newErrors.q9 = "Please enter a valid email address or leave it blank."
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (validateSection(step)) {
      setStep(step + 1)
    }
  }

  function handleBack() {
    setErrors({})
    setStep(step - 1)
  }

  function toggleReality(option: string) {
    setData((prev) => {
      const exists = prev.q1_reality.includes(option)
      let next: string[]
      if (exists) {
        next = prev.q1_reality.filter((o) => o !== option)
      } else {
        if (prev.q1_reality.length >= 2) return prev
        next = [...prev.q1_reality, option]
      }
      return { ...prev, q1_reality: next }
    })
    if (errors.q1) setErrors((prev) => ({ ...prev, q1: "" }))
  }

  async function handleSubmit() {
    if (!validateSection(3)) return

    setIsSubmitting(true)
    setMessage(null)

    try {
      // Collect UTM params if present
      const params = new URLSearchParams(window.location.search)
      const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
      const utm: Record<string, string> = {}
      utmKeys.forEach((k) => {
        const v = params.get(k)
        if (v) utm[k] = v
      })

      const response = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          source: {
            origin: window.location.origin,
            page_path: window.location.pathname,
            referrer: document.referrer || "",
            ...(Object.keys(utm).length > 0 ? { utm } : {}),
          },
        }),
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ text: result.message, type: "success" })
        setData(initialData)
        setStep(4) // show thank-you view
      } else {
        setMessage({
          text: result.message || "Something went wrong. Please try again.",
          type: "error",
        })
      }
    } catch {
      setMessage({ text: "Something went wrong. Please try again.", type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // -- Intro --
  if (step === 0) {
    return (
      <div ref={topRef}>
        {/* Hero banner with background image */}
        <section className="relative overflow-hidden py-24 md:py-32">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/images/survey-bg.jpg)" }}
          />
          <div className="absolute inset-0 bg-[#2d3a4a]/80" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

          <div className="relative mx-auto w-[90%] text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur">
              <ClipboardList className="h-8 w-8 text-[#5ab892]" />
            </div>
            <h1 className="mt-6 text-balance text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Help Us Build Something That Actually Helps Itinerants
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-relaxed text-white/80 md:text-xl">
              We are exploring a simple idea: what if itinerant teachers had fewer
              paperwork headaches and more time for students?
            </p>
          </div>
        </section>

        {/* Why take this survey */}
        <section className="py-16 md:py-20">
          <div className="mx-auto w-[90%]">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Why Your Input Matters
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-muted-foreground md:text-lg">
                Before we write a single line of code, we want to hear from the people
                who would actually use this. Your answers directly shape what gets built.
              </p>

              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent/10">
                    <Clock className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Only 3-4 Minutes</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Nine questions. No account needed. Your time is respected.
                  </p>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent/10">
                    <MessageSquare className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Your Voice Shapes the Product</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Every response is read by the founding team. Your pain points become our priorities.
                  </p>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent/10">
                    <Shield className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Completely Anonymous</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Email is optional. We only ask so we can follow up if you want us to.
                  </p>
                </div>
              </div>

              <div className="mt-12 flex flex-col items-center gap-3 text-center">
                <p className="font-medium text-foreground">
                  Ready to help us build something better?
                </p>
                <Button size="lg" onClick={() => setStep(1)} className="gap-2">
                  Start the Survey
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // -- Thank-you --
  if (step === 4) {
    return (
      <section className="flex min-h-[60vh] items-center py-20 md:py-28">
        <div className="mx-auto w-[90%] max-w-3xl" ref={topRef}>
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle2 className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Thank you for your voice.
            </h2>
            <p className="max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground">
              Your feedback is invaluable. Everything you shared will directly shape
              what we build. If you left your email, we will be in touch.
            </p>
            {message && (
              <div
                ref={messageRef}
                role="status"
                aria-live="polite"
                className="flex items-center gap-3 rounded-md border border-accent/30 bg-accent/5 p-4 text-sm text-accent"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                {message.text}
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  // -- Steps 1 / 2 / 3 --
  const sectionTitles = ["", "The Reality", "What \"Better\" Would Look Like", "Early Access"]
  const sectionDescriptions = [
    "",
    "Let us understand where you are right now.",
    "Imagine a world with less paperwork stress.",
    "Would you want to be part of the solution?",
  ]

  return (
    <section className="min-h-[60vh] py-20 md:py-28">
      <div className="mx-auto w-[90%] max-w-3xl" ref={topRef}>
        {/* Progress indicator */}
        <div className="mb-10 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {s}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {sectionTitles[step]}
          </h2>
          <p className="mt-2 text-muted-foreground">{sectionDescriptions[step]}</p>
        </div>

        <div className="mt-10 rounded-lg border border-border/60 bg-card p-6 shadow-sm md:p-8">
          {/* SECTION 1 */}
          {step === 1 && (
            <div className="flex flex-col gap-8">
              {/* Q1 */}
              <fieldset className="flex flex-col gap-3">
                <legend className="text-base font-medium text-foreground">
                  1. Which statement feels most true right now?{" "}
                  <span className="text-sm font-normal text-muted-foreground">(Select up to 2)</span>
                </legend>
                <div className="flex flex-col gap-2.5">
                  {REALITY_OPTIONS.map((option) => {
                    const checked = data.q1_reality.includes(option)
                    const disabled = !checked && data.q1_reality.length >= 2
                    return (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                          checked
                            ? "border-accent/50 bg-accent/5"
                            : disabled
                              ? "cursor-not-allowed border-border/40 opacity-50"
                              : "border-border/60 hover:border-border hover:bg-secondary/50"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={() => toggleReality(option)}
                          className="mt-0.5"
                        />
                        <span className="text-sm leading-relaxed text-foreground">{option}</span>
                      </label>
                    )
                  })}
                </div>
                {errors.q1 && (
                  <p className="text-sm text-destructive" role="alert">{errors.q1}</p>
                )}
              </fieldset>

              {/* Q2 */}
              <div className="flex flex-col gap-3">
                <Label className="text-base font-medium">
                  2. On a scale of 1-10, how overwhelmed do you feel during your busiest season?
                </Label>
                <p className="text-sm text-muted-foreground">
                  1 = totally manageable, 10 = unsustainable
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Slider
                    value={[data.q2_overwhelm]}
                    onValueChange={([val]) => setData({ ...data, q2_overwhelm: val })}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span className="text-lg font-semibold text-foreground">{data.q2_overwhelm}</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              {/* Q3 */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="q3" className="text-base font-medium">
                  3. If one part of your workload disappeared tomorrow, what would you remove?
                </Label>
                <Textarea
                  id="q3"
                  placeholder="Share what comes to mind..."
                  value={data.q3_remove}
                  onChange={(e) => {
                    setData({ ...data, q3_remove: e.target.value })
                    if (errors.q3) setErrors({ ...errors, q3: "" })
                  }}
                  rows={3}
                  maxLength={1000}
                  aria-invalid={!!errors.q3}
                  aria-describedby={errors.q3 ? "q3-error" : undefined}
                />
                {errors.q3 && (
                  <p id="q3-error" className="text-sm text-destructive" role="alert">{errors.q3}</p>
                )}
              </div>
            </div>
          )}

          {/* SECTION 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-8">
              {/* Q4 */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="q4" className="text-base font-medium">
                  4. When you imagine "life without paperwork stress," what changes first?
                </Label>
                <Textarea
                  id="q4"
                  placeholder="What would be different?"
                  value={data.q4_no_stress}
                  onChange={(e) => {
                    setData({ ...data, q4_no_stress: e.target.value })
                    if (errors.q4) setErrors({ ...errors, q4: "" })
                  }}
                  rows={3}
                  maxLength={1000}
                  aria-invalid={!!errors.q4}
                  aria-describedby={errors.q4 ? "q4-error" : undefined}
                />
                {errors.q4 && (
                  <p id="q4-error" className="text-sm text-destructive" role="alert">{errors.q4}</p>
                )}
              </div>

              {/* Q5 */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="q5" className="text-base font-medium">
                  5. If a tool existed that truly helped itinerants, what would it absolutely need to do?
                </Label>
                <p className="text-sm text-muted-foreground">
                  Examples: scheduling, tracking minutes, IEP documentation, reminders,
                  compliance alerts, travel organization, etc.
                </p>
                <Textarea
                  id="q5"
                  placeholder="What features matter most to you?"
                  value={data.q5_must_do}
                  onChange={(e) => {
                    setData({ ...data, q5_must_do: e.target.value })
                    if (errors.q5) setErrors({ ...errors, q5: "" })
                  }}
                  rows={3}
                  maxLength={1000}
                  aria-invalid={!!errors.q5}
                  aria-describedby={errors.q5 ? "q5-error" : undefined}
                />
                {errors.q5 && (
                  <p id="q5-error" className="text-sm text-destructive" role="alert">{errors.q5}</p>
                )}
              </div>

              {/* Q6 */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="q6" className="text-base font-medium">
                  6. What would make you NOT use a new system?
                </Label>
                <Textarea
                  id="q6"
                  placeholder="What would be a dealbreaker?"
                  value={data.q6_dealbreaker}
                  onChange={(e) => {
                    setData({ ...data, q6_dealbreaker: e.target.value })
                    if (errors.q6) setErrors({ ...errors, q6: "" })
                  }}
                  rows={3}
                  maxLength={1000}
                  aria-invalid={!!errors.q6}
                  aria-describedby={errors.q6 ? "q6-error" : undefined}
                />
                {errors.q6 && (
                  <p id="q6-error" className="text-sm text-destructive" role="alert">{errors.q6}</p>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3 */}
          {step === 3 && (
            <div className="flex flex-col gap-8">
              {/* Q7 */}
              <fieldset className="flex flex-col gap-3">
                <legend className="text-base font-medium text-foreground">
                  7. If we created something simple and time-saving, would you want early access?
                </legend>
                <RadioGroup
                  value={data.q7_early_access}
                  onValueChange={(val) => {
                    setData({ ...data, q7_early_access: val })
                    if (errors.q7) setErrors({ ...errors, q7: "" })
                  }}
                  className="flex flex-col gap-2"
                >
                  {EARLY_ACCESS_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                        data.q7_early_access === option
                          ? "border-accent/50 bg-accent/5"
                          : "border-border/60 hover:border-border hover:bg-secondary/50"
                      }`}
                    >
                      <RadioGroupItem value={option} />
                      <span className="text-sm text-foreground">{option}</span>
                    </label>
                  ))}
                </RadioGroup>
                {errors.q7 && (
                  <p className="text-sm text-destructive" role="alert">{errors.q7}</p>
                )}
              </fieldset>

              {/* Q8 */}
              <fieldset className="flex flex-col gap-3">
                <legend className="text-base font-medium text-foreground">
                  8. Would you be willing to test an early version and give honest feedback?
                </legend>
                <RadioGroup
                  value={data.q8_willing_to_test}
                  onValueChange={(val) => {
                    setData({ ...data, q8_willing_to_test: val })
                    if (errors.q8) setErrors({ ...errors, q8: "" })
                  }}
                  className="flex flex-col gap-2"
                >
                  {TEST_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                        data.q8_willing_to_test === option
                          ? "border-accent/50 bg-accent/5"
                          : "border-border/60 hover:border-border hover:bg-secondary/50"
                      }`}
                    >
                      <RadioGroupItem value={option} />
                      <span className="text-sm text-foreground">{option}</span>
                    </label>
                  ))}
                </RadioGroup>
                {errors.q8 && (
                  <p className="text-sm text-destructive" role="alert">{errors.q8}</p>
                )}
              </fieldset>

              {/* Q9 */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="q9" className="text-base font-medium">
                  9. If you would like updates or early access, leave your email below.
                </Label>
                <p className="text-sm text-muted-foreground">Optional -- no pressure.</p>
                <Input
                  id="q9"
                  type="email"
                  placeholder="you@example.com"
                  value={data.q9_email}
                  onChange={(e) => {
                    setData({ ...data, q9_email: e.target.value })
                    if (errors.q9) setErrors({ ...errors, q9: "" })
                  }}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.q9}
                  aria-describedby={errors.q9 ? "q9-error" : undefined}
                />
                {errors.q9 && (
                  <p id="q9-error" className="text-sm text-destructive" role="alert">{errors.q9}</p>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {message?.type === "error" && (
            <div
              ref={messageRef}
              role="status"
              aria-live="polite"
              className="mt-6 flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {message.text}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button onClick={handleNext} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Survey"
                )}
              </Button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your responses are confidential and used only to shape EasyCaseload.
        </p>
      </div>
    </section>
  )
}
