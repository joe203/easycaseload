import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AccessGate } from "@/components/access-gate"
import { AppSidebar } from "@/components/app-sidebar"

const ALLOWED_STATUSES = ["beta", "active", "trial"]
const ADMIN_EMAILS = ["joe.cabrera.21@gmail.com"]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/signin")
  }

  // Fetch user profile to check access_status
  const { data: profile } = await supabase
    .from("profiles")
    .select("access_status, full_name, email, role")
    .eq("id", user.id)
    .single()

  const accessStatus = profile?.access_status || "none"
  const userName = profile?.full_name || profile?.email || user.email || ""
  const isAdmin = ADMIN_EMAILS.includes(user.email || "")

  if (!isAdmin && !ALLOWED_STATUSES.includes(accessStatus)) {
    return <AccessGate status={accessStatus} />
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar userName={userName} />
      <div className="flex flex-1 flex-col overflow-auto">
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
