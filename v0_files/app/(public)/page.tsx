import { HeroSection } from "@/components/hero-section"
import { ProblemSection } from "@/components/problem-section"
import { GuideSection } from "@/components/guide-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { PlanSection } from "@/components/plan-section"
import { EarlyAccessSection } from "@/components/early-access-section"
import { ContactSection } from "@/components/contact-section"

export default function Home() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <GuideSection />
      <HowItWorksSection />
      <PlanSection />
      <EarlyAccessSection />
      <ContactSection />
    </>
  )
}
