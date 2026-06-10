export interface Student {
  id: string
  school_id: string
  user_id: string
  first_name: string
  last_name: string
  grade: string | null
  student_id_number: string | null
  case_manager: string | null
  status: 'active' | 'inactive' | 'graduated' | 'transferred'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StudentFormData {
  first_name: string
  last_name: string
  grade?: string
  student_id_number?: string
  case_manager?: string
  status: 'active' | 'inactive' | 'graduated' | 'transferred'
  notes?: string
}

export const STUDENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'transferred', label: 'Transferred' },
] as const

export const GRADE_OPTIONS = [
  { value: 'Pre-K', label: 'Pre-K' },
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
  { value: '9', label: '9th Grade' },
  { value: '10', label: '10th Grade' },
  { value: '11', label: '11th Grade' },
  { value: '12', label: '12th Grade' },
] as const
