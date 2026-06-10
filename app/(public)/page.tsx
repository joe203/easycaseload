import { HeroSection } from "@/components/hero-section"
import { ProblemSection } from "@/components/problem-section"
import { GuideSection } from "@/components/guide-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { PlanSection } from "@/components/plan-section"
import { ContactSection } from "@/components/contact-section"

export default function Home() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <GuideSection />
      <HowItWorksSection />
      <PlanSection />
      <ContactSection />
    </>
  )
}
