'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentTeacherId } from '@/lib/supabase/teacher'
import { getTeacherAccess, ACCESS_MESSAGES } from '@/lib/supabase/access'
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
  const access = await getTeacherAccess()
  if (!access) return { data: null, error: 'Not authenticated' }
  if (!access.canUploadDocuments) {
    return {
      data: null,
      error: access.tier === 'demo_expired' ? ACCESS_MESSAGES.demoExpired : ACCESS_MESSAGES.demoNoUploads,
    }
  }
  const teacherId = access.teacherId

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

  // Remove the file from storage (best-effort; the row delete below is the
  // source of truth, and orphaned objects are cleaned up by path prefix).
  if (filePath) {
    await supabase.storage.from(BUCKET).remove([filePath])
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('teacher_id', teacherId)

  if (error) return { error: error.message }
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
