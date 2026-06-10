import type { Metadata } from "next"
import { SurveyContent } from "@/components/survey-content"

export const metadata: Metadata = {
  title: "Founding Feedback Survey - EasyCaseload",
  description:
    "Help us build something that actually helps itinerants. This short survey (3-4 minutes) shapes what we build next.",
}

export default function SurveyPage() {
  return <SurveyContent />
}
