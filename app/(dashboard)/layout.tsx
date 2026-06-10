import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"

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

  // No access gate — anyone signed in reaches the dashboard.
  const { data: teacher } = await supabase
    .from("teachers")
    .select("full_name, email")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  const userName = teacher?.full_name || teacher?.email || user.email || ""

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
