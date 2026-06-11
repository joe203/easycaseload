'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import type { Student } from '@/lib/types/student'

// Live caseload list: useQuery fetches, a Realtime channel invalidates on any
// change to public.students so the UI updates without a refresh (CLAUDE.md §12).
export function useStudents(initialData?: Student[]) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('last_name')
      if (error) throw error
      return data as Student[]
    },
    initialData,
  })

  useEffect(() => {
    const channel = supabase
      .channel('students-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => queryClient.invalidateQueries({ queryKey: ['students'] })
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, supabase])

  return query
}
