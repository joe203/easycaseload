'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import type { School } from '@/lib/types/school'

// Live schools list: useQuery fetches, a Realtime channel invalidates on any
// change to public.schools so the UI updates without a refresh (CLAUDE.md §12).
export function useSchools(initialData?: School[]) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('school_name')
      if (error) throw error
      return data as School[]
    },
    initialData,
  })

  useEffect(() => {
    const channel = supabase
      .channel('schools-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schools' },
        () => queryClient.invalidateQueries({ queryKey: ['schools'] })
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, supabase])

  return query
}
