import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmailClientContent } from "@/components/email/email-client-content"

export default async function EmailPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/signin")

  return <EmailClientContent userEmail={user.email || ""} />
}
