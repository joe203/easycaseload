'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { StudentDocument, DocumentFormData } from '@/lib/types/document'

export async function getDocumentsByStudent(studentId: string): Promise<{ data: StudentDocument[] | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('student_docs')
    .select('*')
    .eq('student_id', studentId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function createDocument(
  studentId: string,
  schoolId: string,
  formData: DocumentFormData,
  fileUrl: string,
  fileName: string
): Promise<{ data: StudentDocument | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('student_docs')
    .insert({
      student_id: studentId,
      school_id: schoolId,
      user_id: user.id,
      title: formData.title,
      doc_type: formData.doc_type,
      description: formData.description || null,
      file_url: fileUrl,
      file_name: fileName,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath(`/app/students/${studentId}`)
  return { data, error: null }
}

export async function deleteDocument(
  id: string,
  studentId: string,
  filePath: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Delete file from storage
  const { error: storageError } = await supabase.storage
    .from('student-documents')
    .remove([filePath])

  if (storageError) {
    console.error('Error deleting file from storage:', storageError)
    // Continue to delete the record even if storage deletion fails
  }

  // Delete record from database
  const { error } = await supabase
    .from('student_docs')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/app/students/${studentId}`)
  return { error: null }
}

export async function uploadDocumentFile(
  file: File,
  userId: string,
  schoolId: string,
  studentId: string
): Promise<{ url: string; path: string } | { error: string }> {
  const supabase = await createClient()
  
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `${userId}/${schoolId}/${studentId}/${fileName}`

  const { error } = await supabase.storage
    .from('student-documents')
    .upload(filePath, file)

  if (error) {
    return { error: error.message }
  }

  const { data: urlData } = supabase.storage
    .from('student-documents')
    .getPublicUrl(filePath)

  return { url: urlData.publicUrl, path: filePath }
}

export async function getDocumentSignedUrl(filePath: string): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { url: null, error: 'Not authenticated' }
  }

  const { data, error } = await supabase.storage
    .from('student-documents')
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (error) {
    return { url: null, error: error.message }
  }

  return { url: data.signedUrl, error: null }
}
