export interface School {
  id: string
  user_id: string
  school_name: string
  district_name: string | null
  campus_name: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
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
  notes?: string
}
