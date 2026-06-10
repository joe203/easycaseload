import { MessageSquare, Lightbulb, Rocket } from "lucide-react"

const steps = [
  {
    icon: MessageSquare,
    title: "Share your caseload challenges",
    description:
      "Tell us how you currently manage your work so we can design a system that truly fits.",
  },
  {
    icon: Lightbulb,
    title: "Help shape the platform",
    description:
      "Your feedback directly influences what we build and how we prioritize features.",
  },
  {
    icon: Rocket,
    title: "Be among the first onboard",
    description:
      "Sign up now and start using EasyCaseload with hands-on onboarding and direct support from us.",
  },
]

export function PlanSection() {
  return (
    <section className="bg-[#2d3a4a] py-20 md:py-28">
      <div className="mx-auto w-[90%]">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5ab892]">
            Get Involved
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {"Here\u2019s what\u2019s happening now:"}
          </h2>
        </div>

        {/* Vertical timeline layout */}
        <div className="mx-auto mt-14 max-w-3xl">
          <div className="relative space-y-0">
            {steps.map((step, i) => (
              <div key={step.title} className="relative flex gap-6 pb-12 last:pb-0">
                {/* Timeline line */}
                {i < steps.length - 1 && (
                  <div className="absolute left-[23px] top-[56px] bottom-0 w-px bg-white/15" />
                )}

                {/* Icon circle */}
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#5ab892]/40 bg-[#5ab892]/10">
                  <step.icon className="h-5 w-5 text-[#5ab892]" />
                </div>

                {/* Content */}
                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-white/65">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
