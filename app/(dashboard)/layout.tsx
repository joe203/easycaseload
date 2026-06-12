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

  const { data: teacher } = await supabase
    .from("teachers")
    .select("full_name, email, phone_verified")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  // Phone gate (V2 registration): one enforcement point for the whole
  // dashboard. /app/verify-phone lives in the (gate) route group — outside
  // this layout — so the redirect cannot loop. Flag stays off until 10DLC
  // clears and OTP texts actually deliver.
  if (
    process.env.PHONE_VERIFICATION_ENABLED === "true" &&
    teacher &&
    !teacher.phone_verified
  ) {
    redirect("/app/verify-phone")
  }

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
