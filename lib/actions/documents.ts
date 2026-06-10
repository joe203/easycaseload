'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentTeacherId } from '@/lib/supabase/teacher'
import { revalidatePath } from 'next/cache'
import type { StudentDocument, DocumentFormData } from '@/lib/types/document'

const BUCKET = 'student-documents'

export async function getDocumentsByStudent(
  studentId: string
): Promise<{ data: StudentDocument[] | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('entity_type', 'student')
    .eq('entity_id', studentId)
    .order('uploaded_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createDocument(
  studentId: string,
  formData: DocumentFormData,
  filePath: string,
  fileName: string,
  mimeType?: string | null,
  sizeBytes?: number | null
): Promise<{ data: StudentDocument | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      teacher_id: teacherId,
      entity_type: 'student',
      entity_id: studentId,
      title: formData.title,
      doc_type: formData.doc_type,
      description: formData.description || null,
      file_path: filePath,
      file_name: fileName,
      mime_type: mimeType || null,
      size_bytes: sizeBytes ?? null,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath(`/app/students/${studentId}`)
  return { data, error: null }
}

export async function deleteDocument(
  id: string,
  studentId: string,
  filePath: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { error: 'Not authenticated' }

  // Remove the file from storage (best-effort).
  if (filePath) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([filePath])
    if (storageError) console.error('Error deleting file from storage:', storageError)
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('teacher_id', teacherId)

  if (error) return { error: error.message }

  revalidatePath(`/app/students/${studentId}`)
  return { error: null }
}

// Signed URL only — the bucket is private (student PII). Never use public URLs.
export async function getDocumentSignedUrl(
  filePath: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { url: null, error: 'Not authenticated' }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600)
  if (error) return { url: null, error: error.message }
  return { url: data.signedUrl, error: null }
}
