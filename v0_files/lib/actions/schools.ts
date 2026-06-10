"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { School, SchoolFormData } from "@/lib/types/school"

export async function getSchools(): Promise<{ data: School[] | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("user_id", user.id)
    .order("school_name", { ascending: true })

  if (error) {
    console.error("Error fetching schools:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function getSchool(id: string): Promise<{ data: School | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error) {
    console.error("Error fetching school:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function createSchool(formData: SchoolFormData): Promise<{ data: School | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("schools")
    .insert({
      user_id: user.id,
      school_name: formData.school_name,
      district_name: formData.district_name || null,
      campus_name: formData.campus_name || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zip: formData.zip || null,
      notes: formData.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating school:", error)
    return { data: null, error: error.message }
  }

  revalidatePath("/app/schools")
  return { data, error: null }
}

export async function updateSchool(
  id: string,
  formData: SchoolFormData
): Promise<{ data: School | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

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
      notes: formData.notes || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    console.error("Error updating school:", error)
    return { data: null, error: error.message }
  }

  revalidatePath("/app/schools")
  return { data, error: null }
}

export async function deleteSchool(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("schools")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("Error deleting school:", error)
    return { error: error.message }
  }

  revalidatePath("/app/schools")
  return { error: null }
}
