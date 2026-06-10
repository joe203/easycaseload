import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="bg-[#2d3a4a] py-10">
      <div className="mx-auto flex w-[90%] flex-col items-center gap-6">
        <div className="flex w-full flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <span className="text-sm font-semibold text-white">
              EasyCaseload
            </span>
            <span className="text-xs text-white/60">
              Simpler caseload management for independent professionals.
            </span>
            <span className="text-xs text-white/60">
              EasyCaseload is a product of{" "}
              <a
                href="https://fivesixteen.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-white/80 underline underline-offset-2 transition-colors hover:text-[#5ab892]"
              >
                fivesixteen.ai
              </a>
              .
            </span>
          </div>
          <nav className="flex items-center gap-6" aria-label="Footer navigation">
            <Link
              href="/"
              className="text-xs text-white/60 transition-colors hover:text-white"
            >
              Home
            </Link>
            <a
              href="#contact"
              className="text-xs text-white/60 transition-colors hover:text-white"
            >
              Contact
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4 border-t border-white/15 pt-4">
          <Link
            href="/terms"
            className="text-xs text-white/50 transition-colors hover:text-white"
          >
            Terms of Use
          </Link>
          <span className="text-xs text-white/25" aria-hidden="true">|</span>
          <Link
            href="/privacy"
            className="text-xs text-white/50 transition-colors hover:text-white"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
