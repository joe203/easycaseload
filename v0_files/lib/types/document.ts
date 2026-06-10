export interface StudentDocument {
  id: string
  student_id: string
  school_id: string
  user_id: string
  title: string
  doc_type: DocumentType
  description: string | null
  file_url: string
  file_name: string | null
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
