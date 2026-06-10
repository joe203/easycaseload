import { createClient } from "@/lib/supabase/server"
import { SchoolsContent } from "@/components/schools/schools-content"
import type { School } from "@/lib/types/school"

export default async function SchoolsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  let schools: School[] = []
  
  if (user) {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("user_id", user.id)
      .order("school_name", { ascending: true })
    
    if (!error && data) {
      schools = data
    }
  }

  return <SchoolsContent initialSchools={schools} />
}
