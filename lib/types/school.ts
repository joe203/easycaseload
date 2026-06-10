export interface School {
  id: string
  teacher_id: string
  school_name: string
  district_name: string | null
  campus_name: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  supervisor_name: string | null
  supervisor_email: string | null
  notes: string | null
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SchoolFormData {
  school_name: string
  district_name?: string
  campus_name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  supervisor_name?: string
  supervisor_email?: string
  notes?: string
}
