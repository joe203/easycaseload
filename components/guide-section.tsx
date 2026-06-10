import { MessageCircle } from "lucide-react"

export function GuideSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto w-[90%]">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <MessageCircle className="h-7 w-7 text-accent" />
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Meet Savannah, your caseload assistant.
          </h2>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
            Tell her about your schools and students the way you&apos;d tell a
            colleague — out loud, in your own words. She organizes everything:
            your campuses, your caseload, your session notes, your reports. No
            forms. No data entry. Just talk.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-5 py-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-sm font-medium text-foreground/80">
              Built for professionals who run their own caseloads — not large
              institutions.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
