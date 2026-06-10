'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentTeacherId } from '@/lib/supabase/teacher'
import { revalidatePath } from 'next/cache'
import type { Student, StudentFormData } from '@/lib/types/student'

export async function getStudentsBySchool(schoolId: string): Promise<{ data: Student[] | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId)
    .order('last_name', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getStudents(): Promise<{ data: Student[] | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('last_name', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getStudent(id: string): Promise<{ data: Student | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .eq('teacher_id', teacherId)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createStudent(
  schoolId: string | null,
  formData: StudentFormData
): Promise<{ data: Student | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('students')
    .insert({
      teacher_id: teacherId,
      school_id: schoolId || null,
      first_name: formData.first_name,
      last_name: formData.last_name,
      grade: formData.grade || null,
      student_id_number: formData.student_id_number || null,
      case_manager: formData.case_manager || null,
      status: formData.status,
      notes: formData.notes || null,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  if (schoolId) revalidatePath(`/app/schools/${schoolId}`)
  revalidatePath('/app/students')
  return { data, error: null }
}

export async function updateStudent(
  id: string,
  schoolId: string | null,
  formData: StudentFormData
): Promise<{ data: Student | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('students')
    .update({
      school_id: schoolId || null,
      first_name: formData.first_name,
      last_name: formData.last_name,
      grade: formData.grade || null,
      student_id_number: formData.student_id_number || null,
      case_manager: formData.case_manager || null,
      status: formData.status,
      notes: formData.notes || null,
    })
    .eq('id', id)
    .eq('teacher_id', teacherId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  if (schoolId) revalidatePath(`/app/schools/${schoolId}`)
  revalidatePath('/app/students')
  return { data, error: null }
}

export async function deleteStudent(
  id: string,
  schoolId: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)
    .eq('teacher_id', teacherId)

  if (error) return { error: error.message }

  if (schoolId) revalidatePath(`/app/schools/${schoolId}`)
  revalidatePath('/app/students')
  return { error: null }
}

export async function getStudentCount(schoolId: string): Promise<number> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return 0

  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId)

  return count || 0
}
