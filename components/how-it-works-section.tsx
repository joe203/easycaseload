import { Mail, Mic, FileText } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Mail,
    title: "Create your account with just your email.",
    description:
      "Click Get Started, type your email, and tap the link we send you. No passwords, no forms \u2014 you\u2019re in.",
  },
  {
    number: "02",
    icon: Mic,
    title: "Talk. Savannah sets everything up.",
    description:
      "Tell her your name, your schools, and your students \u2014 voice-to-text from your phone works great. She builds your caseload while you talk.",
  },
  {
    number: "03",
    icon: FileText,
    title: "Log sessions by talking, too.",
    description:
      "On the drive home: \u201cSaw Johnny, 30 minutes, good session.\u201d Your documentation and reports build themselves.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-card py-20 md:py-28 scroll-mt-16">
      <div className="mx-auto w-[90%]">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {"It\u2019s Simple."}
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            Here&apos;s exactly what to do.
          </p>
        </div>

        {/* Horizontal numbered cards with connecting line */}
        <div className="relative mx-auto mt-16 max-w-6xl">
          {/* Connecting line (visible on md+) */}
          <div className="absolute left-0 right-0 top-[52px] hidden h-px bg-border md:block" />

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative flex flex-col items-center">
                {/* Large step number */}
                <div className="relative z-10 flex h-[104px] w-[104px] items-center justify-center rounded-2xl border-2 border-accent/30 bg-background">
                  <span className="text-4xl font-bold tracking-tight text-accent">
                    {step.number}
                  </span>
                </div>

                {/* Card below the number */}
                <div className="mt-6 w-full rounded-xl border border-border/60 bg-background p-6 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-accent/10">
                    <step.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-14 max-w-3xl text-center text-lg leading-relaxed text-muted-foreground">
          {"That\u2019s it. No complicated system. No extra admin layer. (Coming soon: text Savannah from anywhere \u2014 no laptop needed.)"}
        </p>
      </div>
    </section>
  )
}
