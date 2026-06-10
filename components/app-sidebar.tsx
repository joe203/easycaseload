"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Compass,
  School,
  Users,
  BarChart3,
  CreditCard,
  LogOut,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navItems = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { label: "Onboarding", href: "/app/onboarding", icon: Compass },
  { label: "Schools", href: "/app/schools", icon: School },
  { label: "Students", href: "/app/students", icon: Users },
  { label: "Reports", href: "/app/reports", icon: BarChart3 },
  { label: "Billing", href: "/app/billing", icon: CreditCard },
]

export function AppSidebar({ userName }: { userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border/60 bg-card">
      <div className="flex h-14 items-center px-5">
        <Link href="/app/dashboard" className="text-lg font-semibold tracking-tight text-foreground">
          EasyCaseload
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border/60 p-3">
        {userName && (
          <p className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {userName}
          </p>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
