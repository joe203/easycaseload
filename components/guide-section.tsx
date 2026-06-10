export function GuideSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto w-[90%]">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {"We're building something simpler."}
          </h2>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
            EasyCaseload is being developed with real-world feedback from
            independent professionals. Our goal is to create a system that
            reduces administrative noise and supports the way you actually work.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-5 py-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-sm font-medium text-foreground/80">
              Designed for professionals who run their own caseloads — not large
              institutions.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
