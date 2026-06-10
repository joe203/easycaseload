import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background image - using Vercel Blob for reliable hosting */}
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/pretty_school_teacher-FwmCliIpikImQyogChrSWvYil0NLT0.jpeg"
        alt="Professional woman in green blazer holding tablet in front of school building"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
        unoptimized
      />

      {/* Dark overlay for text contrast */}
      <div className="absolute inset-0 bg-[#2d3a4a]/75" />

      {/* Subtle gradient fade at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

      {/* Content */}
      <div className="relative mx-auto flex w-[90%] flex-col items-center pb-24 pt-28 text-center md:pb-32 md:pt-36">
        <h1 className="max-w-4xl text-balance text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
          You Became an Itinerant to Help Students.{" "}
          <span className="text-[#5ab892]">
            Not to spend your evenings doing paperwork.
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-pretty text-lg leading-relaxed text-white/80 md:text-xl">
          {"You're already doing the hard work — driving campus to campus, serving kids who need you. You shouldn't have to come home and work a second shift."}
        </p>
        <p className="mt-4 max-w-3xl text-pretty text-lg leading-relaxed text-white/80 md:text-xl">
          EasyCaseload generates your reports, emails, invoices, and session documentation in minutes — so you can close the laptop and actually rest.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="gap-2 bg-[#2e8b6e] text-white hover:bg-[#257a5e]">
            <a href="/signup">
              Get Started — Just Talk
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild size="lg" className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20">
            <a href="#how-it-works">
              See How It Works
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
