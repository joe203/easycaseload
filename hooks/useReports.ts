'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import type { ReportRow } from '@/lib/types/report'

// useQuery + Realtime (CLAUDE.md §12). A generated report appears without a
// refresh; the generate mutation also invalidates ['reports'] for instant feedback.
export function useReports() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('generated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ReportRow[]
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel('reports-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, supabase])

  return query
}
