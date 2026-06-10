// Polymorphic document model — a document attaches to any entity
// (student/school/teacher/log/...) via entity_type + entity_id.
// Files live in the PRIVATE 'student-documents' bucket; access is signed-URL only.

export interface StudentDocument {
  id: string
  teacher_id: string
  entity_type: string // 'student' | 'school' | 'teacher' | 'log' | ...
  entity_id: string | null
  title: string | null
  doc_type: string | null
  description: string | null
  file_path: string | null
  file_name: string | null
  mime_type: string | null
  size_bytes: number | null
  metadata?: Record<string, unknown>
  uploaded_at: string
  created_at: string
  updated_at: string
}

export type DocumentType =
  | 'IEP'
  | 'Evaluation'
  | 'Progress Report'
  | 'Session Notes'
  | 'Parent Communication'
  | 'Assessment'
  | 'Behavior Notes'
  | 'Other'

export interface DocumentFormData {
  title: string
  doc_type: DocumentType
  description?: string
}

export const DOC_TYPE_OPTIONS = [
  { value: 'IEP', label: 'IEP' },
  { value: 'Evaluation', label: 'Evaluation' },
  { value: 'Progress Report', label: 'Progress Report' },
  { value: 'Session Notes', label: 'Session Notes' },
  { value: 'Parent Communication', label: 'Parent Communication' },
  { value: 'Assessment', label: 'Assessment' },
  { value: 'Behavior Notes', label: 'Behavior Notes' },
  { value: 'Other', label: 'Other' },
] as const
