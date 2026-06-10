import { redirect } from "next/navigation"
import { getCurrentTeacherId } from "@/lib/supabase/teacher"
import { getStudent } from "@/lib/actions/students"
import { getSchool } from "@/lib/actions/schools"
import { getDocumentsByStudent } from "@/lib/actions/documents"
import { StudentDetailContent } from "@/components/students/student-detail-content"

export default async function StudentDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params

  const teacherId = await getCurrentTeacherId()
  if (!teacherId) {
    redirect("/signin")
  }

  const { data: student, error: studentError } = await getStudent(params.id)
  if (studentError || !student) {
    redirect("/app/students")
  }

  // School is optional — a student may not be assigned to one.
  const { data: school } = student.school_id
    ? await getSchool(student.school_id)
    : { data: null }

  const { data: documents } = await getDocumentsByStudent(params.id)

  return (
    <StudentDetailContent
      student={student}
      school={school}
      initialDocuments={documents || []}
      teacherId={teacherId}
    />
  )
}
