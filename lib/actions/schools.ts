"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentTeacherId } from "@/lib/supabase/teacher"
import { getTeacherAccess, ACCESS_MESSAGES } from "@/lib/supabase/access"
import type { School, SchoolFormData } from "@/lib/types/school"

export async function getSchools(): Promise<{ data: School[] | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("school_name", { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

export async function getSchool(id: string): Promise<{ data: School | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", teacherId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

export async function createSchool(formData: SchoolFormData): Promise<{ data: School | null; error: string | null }> {
  const supabase = await createClient()
  const access = await getTeacherAccess()
  if (!access) return { data: null, error: "Not authenticated" }
  if (access.tier === "demo_expired") return { data: null, error: ACCESS_MESSAGES.demoExpired }
  if (access.maxSchools !== null) {
    const { count } = await supabase
      .from("schools")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", access.teacherId)
    if ((count ?? 0) >= access.maxSchools) {
      return { data: null, error: ACCESS_MESSAGES.demoSchoolCap }
    }
  }
  const teacherId = access.teacherId

  const { data, error } = await supabase
    .from("schools")
    .insert({
      teacher_id: teacherId,
      school_name: formData.school_name,
      district_name: formData.district_name || null,
      campus_name: formData.campus_name || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zip: formData.zip || null,
      supervisor_name: formData.supervisor_name || null,
      supervisor_email: formData.supervisor_email || null,
      notes: formData.notes || null,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

export async function updateSchool(
  id: string,
  formData: SchoolFormData
): Promise<{ data: School | null; error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { data: null, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("schools")
    .update({
      school_name: formData.school_name,
      district_name: formData.district_name || null,
      campus_name: formData.campus_name || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zip: formData.zip || null,
      supervisor_name: formData.supervisor_name || null,
      supervisor_email: formData.supervisor_email || null,
      notes: formData.notes || null,
    })
    .eq("id", id)
    .eq("teacher_id", teacherId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

export async function deleteSchool(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const teacherId = await getCurrentTeacherId()
  if (!teacherId) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("schools")
    .delete()
    .eq("id", id)
    .eq("teacher_id", teacherId)

  if (error) {
    return { error: error.message }
  }
  return { error: null }
}
