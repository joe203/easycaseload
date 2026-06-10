import type { Metadata } from "next"
import { Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Download Email Templates - EasyCaseload",
  description: "Download the EasyCaseload email templates for survey invitations and early access confirmations.",
}

const templates = [
  {
    title: "Survey Invitation",
    description: "Invite itinerant teachers to take the EasyCaseload survey.",
    file: "invite_to_take_survey.html",
  },
  {
    title: "Early Access Confirmed",
    description: "Confirmation email sent after requesting early access.",
    file: "early_access_confirmed.html",
  },
  {
    title: "Thanks for Connecting",
    description: "Auto-reply sent after someone reaches out via the contact form.",
    file: "thanks_for_connecting.html",
  },
  {
    title: "Thank You for Survey",
    description: "Follow-up email sent after a teacher completes the EasyCaseload survey.",
    file: "thank_you_for_survey.html",
  },
]

export default function DownloadEmailPage() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto w-[90%] max-w-3xl">
        <div className="text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Email Templates
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Download styled HTML email templates to use with your email service.
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-6">
          {templates.map((template) => (
            <div
              key={template.file}
              className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold text-foreground">{template.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{template.description}</p>
              </div>
              <div className="flex shrink-0 gap-3">
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <a href={`/emails/${template.file}`} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4" />
                    Preview
                  </a>
                </Button>
                <Button asChild size="sm" className="gap-2">
                  <a href={`/emails/${template.file}`} download={template.file}>
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
