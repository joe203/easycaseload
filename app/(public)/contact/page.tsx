import type { Metadata } from "next"
import { ContactPageContent } from "@/components/contact-page-content"

export const metadata: Metadata = {
  title: "Contact Us - EasyCaseload",
  description:
    "Have a question, idea, or just want to say hello? We would love to hear from you.",
}

export default function ContactPage() {
  return <ContactPageContent />
}
