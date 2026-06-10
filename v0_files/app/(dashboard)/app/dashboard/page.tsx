import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/signin")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, preferences")
    .eq("id", user.id)
    .single()

  const firstName = profile?.full_name?.split(" ")[0] || "there"
  const preferences = (profile?.preferences as Record<string, boolean> | null) || {}

  return (
    <DashboardContent
      firstName={firstName}
      userId={user.id}
      initialPreferences={preferences}
    />
  )
}
