'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Student, StudentFormData } from '@/lib/types/student'

export async function getStudentsBySchool(schoolId: string): Promise<{ data: Student[] | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('school_id', schoolId)
    .order('last_name', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function getStudent(id: string): Promise<{ data: Student | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function createStudent(
  schoolId: string,
  formData: StudentFormData
): Promise<{ data: Student | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      school_id: schoolId,
      user_id: user.id,
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

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath(`/app/schools/${schoolId}`)
  return { data, error: null }
}

export async function updateStudent(
  id: string,
  schoolId: string,
  formData: StudentFormData
): Promise<{ data: Student | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('students')
    .update({
      first_name: formData.first_name,
      last_name: formData.last_name,
      grade: formData.grade || null,
      student_id_number: formData.student_id_number || null,
      case_manager: formData.case_manager || null,
      status: formData.status,
      notes: formData.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath(`/app/schools/${schoolId}`)
  return { data, error: null }
}

export async function deleteStudent(
  id: string,
  schoolId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/app/schools/${schoolId}`)
  return { error: null }
}

export async function getStudentCount(schoolId: string): Promise<number> {
  const supabase = await createClient()
  
  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  return count || 0
}
