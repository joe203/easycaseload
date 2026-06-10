import {
  MapPin,
  FileText,
  CalendarClock,
  Bell,
  LayoutGrid,
} from "lucide-react"

const painPoints = [
  {
    icon: MapPin,
    text: "Tracking clients across multiple locations",
  },
  {
    icon: FileText,
    text: "Managing documentation deadlines",
  },
  {
    icon: CalendarClock,
    text: "Keeping schedules aligned",
  },
  {
    icon: Bell,
    text: "Remembering follow-ups",
  },
  {
    icon: LayoutGrid,
    text: "Piecing together spreadsheets, calendars, and notes",
  },
]

export function ProblemSection() {
  return (
    <section className="bg-card py-20 md:py-28">
      <div className="mx-auto w-[90%]">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {"Caseload work becomes overwhelming when your systems don't support you."}
          </h2>
        </div>
        <div className="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((point) => (
            <div
              key={point.text}
              className="flex items-start gap-5 rounded-lg border border-border/60 bg-background p-6"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent/10">
                <point.icon className="h-6 w-6 text-accent" />
              </div>
              <p className="text-base leading-relaxed text-foreground/80">
                {point.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
