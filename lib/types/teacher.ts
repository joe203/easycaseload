export interface Teacher {
  id: string
  auth_user_id: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  phone_verified: boolean
  status: string // unregistered | invited | in_progress | registered | merge_pending | merged
  role: string // teacher | admin
  source: string | null
  invite_count: number
  last_invited_at: string | null
  preferences: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TeacherIdentity {
  id: string
  teacher_id: string
  kind: "email" | "phone"
  value: string
  verified: boolean
  is_primary: boolean
  created_at: string
  updated_at: string
}
