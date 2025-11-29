import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { FitnessProvider, FitnessActivity } from '@/types'

const supabase = createClient()

export function useStravaStatus() {
  return useQuery({
    queryKey: ['strava-status'],
    queryFn: async () => {
      const response = await fetch('/api/auth/strava?action=status')
      if (!response.ok) throw new Error('Failed to get Strava status')
      return response.json()
    },
  })
}

export function useStravaAuthorize() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/strava?action=authorize')
      if (!response.ok) throw new Error('Failed to get authorization URL')
      const data = await response.json()
      return data.authUrl
    },
  })
}

export function useStravaDisconnect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/strava?action=disconnect', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to disconnect Strava')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strava-status'] })
      queryClient.invalidateQueries({ queryKey: ['fitness-activities'] })
    },
  })
}

export function useStravaSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/strava?action=sync', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to sync Strava activities')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strava-status'] })
      queryClient.invalidateQueries({ queryKey: ['fitness-activities'] })
    },
  })
}

export function useFitnessActivities(date?: string) {
  return useQuery({
    queryKey: ['fitness-activities', date],
    queryFn: async () => {
      let query = supabase
        .from('fitness_activities')
        .select('*')
        .order('start_date', { ascending: false })

      if (date) {
        // Get activities for a specific date
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        query = query
          .gte('start_date', startOfDay.toISOString())
          .lte('start_date', endOfDay.toISOString())
      } else {
        // Get recent activities (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        query = query.gte('start_date', thirtyDaysAgo.toISOString())
      }

      const { data, error } = await query
      if (error) throw error
      return data as FitnessActivity[]
    },
  })
}

