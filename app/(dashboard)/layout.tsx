import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { DemoBanner } from "@/components/demo-banner"
import { getTeacherAccess } from "@/lib/supabase/access"
import { createAdminClient } from "@/lib/supabase/admin"

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

  let access = await getTeacherAccess()

  // Phone gate (V2 registration): one enforcement point for the whole
  // dashboard. /app/verify-phone lives in the (gate) route group — outside
  // this layout — so the redirect cannot loop. Flag stays off until 10DLC
  // clears and OTP texts actually deliver.
  if (
    process.env.PHONE_VERIFICATION_ENABLED === "true" &&
    access &&
    !access.teacher.phone_verified
  ) {
    redirect("/app/verify-phone")
  }

  // Seed the demo workspace on first authenticated load (Phase C). A null
  // demo_expires_at means seeding hasn't run for this teacher yet;
  // seed_demo_workspace is idempotent and service-role only, and it stamps the
  // expiry, so this fires exactly once. Active accounts are never seeded.
  if (access && access.tier === "demo" && !access.teacher.demo_expires_at) {
    try {
      const admin = createAdminClient()
      await admin.rpc("seed_demo_workspace", { p_teacher_id: access.teacherId })
      access = await getTeacherAccess() // refresh so the banner shows the countdown
    } catch {
      // Never block the dashboard on seeding — the teacher can still use the app.
    }
  }

  const userName =
    access?.teacher.full_name || access?.teacher.email || user.email || ""

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar userName={userName} />
      <div className="flex flex-1 flex-col overflow-auto">
        {access && (
          <DemoBanner tier={access.tier} demoExpiresAt={access.demoExpiresAt} />
        )}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
