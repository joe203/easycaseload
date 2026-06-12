import Link from "next/link"

// Focused gate screens (e.g. phone verification) — same minimal chrome as the
// auth pages, deliberately outside the dashboard layout so the layout's
// redirect-to-gate can never loop.
export default function GateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 items-center px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
          EasyCaseload
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        {children}
      </div>
    </div>
  )
}
