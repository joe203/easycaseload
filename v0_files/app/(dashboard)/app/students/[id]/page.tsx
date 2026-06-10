import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getStudent } from "@/lib/actions/students"
import { getSchool } from "@/lib/actions/schools"
import { getDocumentsByStudent } from "@/lib/actions/documents"
import { StudentDetailContent } from "@/components/students/student-detail-content"

export default async function StudentDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/signin")
  }

  const { data: student, error: studentError } = await getStudent(params.id)
  if (studentError || !student) {
    redirect("/app/schools")
  }

  const { data: school, error: schoolError } = await getSchool(student.school_id)
  if (schoolError || !school) {
    redirect("/app/schools")
  }

  const { data: documents } = await getDocumentsByStudent(params.id)

  return (
    <StudentDetailContent
      student={student}
      school={school}
      initialDocuments={documents || []}
      userId={user.id}
    />
  )
}
