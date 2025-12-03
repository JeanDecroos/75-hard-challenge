'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthContext } from '@/components/providers'
import type { Challenge, ChallengeWithTasks, Task, DailyEntry } from '@/types'
import { generateInviteToken, calculateStreak } from '@/lib/utils'

const supabase = createClient()

// Types for optimized challenge data with stats
export interface ChallengeWithStats extends ChallengeWithTasks {
  stats?: {
    completed_days: number
    current_streak: number
    longest_streak: number
    completion_percentage: number
    days_remaining: number
  }
}

// Fetch user's challenges with parallel fetching
export function useChallenges() {
  const { user } = useAuthContext()
  
  return useQuery({
    queryKey: ['challenges', user?.id],
    queryFn: async (): Promise<ChallengeWithTasks[]> => {
      if (!user) throw new Error('Not authenticated')

      // PARALLEL FETCH: Get owned and member challenges simultaneously
      const [ownedResult, memberResult] = await Promise.all([
        supabase
          .from('challenges')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('challenge_members')
          .select('challenge:challenges (*)')
          .eq('user_id', user.id)
      ])

      if (ownedResult.error) {
        console.error('Error fetching owned challenges:', ownedResult.error)
        throw ownedResult.error
      }
      if (memberResult.error) throw memberResult.error

      const ownedChallenges = ownedResult.data || []
      const joinedChallenges = (memberResult.data
        ?.map((m: any) => m.challenge as Challenge)
        .filter(Boolean) || []) as Challenge[]

      // Collect all challenge IDs for batch task fetch
      const allChallengeIds = [
        ...ownedChallenges.map(c => c.id),
        ...joinedChallenges.map(c => c.id)
      ]

      if (allChallengeIds.length === 0) {
        return []
      }

      // SINGLE QUERY: Fetch all tasks for all challenges at once
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('challenge_id', allChallengeIds)

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError)
        throw tasksError
      }

      // Attach tasks to their respective challenges
      const attachTasks = (challenges: Challenge[]): ChallengeWithTasks[] => {
        return challenges.map(challenge => ({
          ...challenge,
          tasks: allTasks?.filter(t => t.challenge_id === challenge.id) || []
        }))
      }

      return [
        ...attachTasks(ownedChallenges),
        ...attachTasks(joinedChallenges)
      ]
    },
    enabled: !!user?.id,
  })
}

// Optimized: Fetch challenges WITH their stats in a single batch
export function useChallengesWithStats() {
  const { user } = useAuthContext()
  
  return useQuery({
    queryKey: ['challenges-with-stats', user?.id],
    queryFn: async (): Promise<ChallengeWithStats[]> => {
      if (!user) throw new Error('Not authenticated')

      // PARALLEL FETCH: challenges, tasks, and daily entries all at once
      const [challengesResult, memberResult] = await Promise.all([
        supabase
          .from('challenges')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('challenge_members')
          .select('challenge:challenges (*)')
          .eq('user_id', user.id)
      ])

      if (challengesResult.error) throw challengesResult.error
      if (memberResult.error) throw memberResult.error

      const ownedChallenges = challengesResult.data || []
      const joinedChallenges = (memberResult.data
        ?.map((m: any) => m.challenge as Challenge)
        .filter(Boolean) || []) as Challenge[]

      const allChallenges = [...ownedChallenges, ...joinedChallenges]
      const allChallengeIds = allChallenges.map(c => c.id)

      if (allChallengeIds.length === 0) {
        return []
      }

      // PARALLEL FETCH: tasks and daily entries for ALL challenges
      const [tasksResult, entriesResult] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .in('challenge_id', allChallengeIds),
        supabase
          .from('daily_entries')
          .select('challenge_id, date, is_complete')
          .in('challenge_id', allChallengeIds)
          .eq('user_id', user.id)
      ])

      if (tasksResult.error) throw tasksResult.error
      if (entriesResult.error) throw entriesResult.error

      const allTasks = tasksResult.data || []
      const allEntries = entriesResult.data || []

      // Build challenges with stats
      return allChallenges.map(challenge => {
        const tasks = allTasks.filter(t => t.challenge_id === challenge.id)
        const entries = allEntries.filter(e => e.challenge_id === challenge.id)
        const completedDates = entries.filter(e => e.is_complete).map(e => e.date)

        // Calculate stats
        const startDate = new Date(challenge.start_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const totalDays = challenge.duration_days
        const elapsedDays = Math.min(Math.max(daysSinceStart, 0), totalDays)
        const completedDays = completedDates.length
        const daysRemaining = Math.max(totalDays - elapsedDays, 0)
        const { current, longest } = calculateStreak(completedDates, challenge.start_date)

        return {
          ...challenge,
          tasks,
          stats: {
            completed_days: completedDays,
            current_streak: current,
            longest_streak: longest,
            completion_percentage: elapsedDays > 0 ? Math.round((completedDays / elapsedDays) * 100) : 0,
            days_remaining: daysRemaining,
          }
        }
      })
    },
    enabled: !!user?.id,
  })
}

// Fetch single challenge with tasks
export function useChallenge(id: string) {
  const { user } = useAuthContext()
  
  return useQuery({
    queryKey: ['challenge', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          tasks (*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as ChallengeWithTasks
    },
    enabled: !!id && !!user,
  })
}

// Create a new challenge
export function useCreateChallenge() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: async (data: {
      name: string
      start_date: string
      duration_days: number
      tasks: Omit<Task, 'id' | 'challenge_id' | 'created_at'>[]
    }) => {
      if (!user) throw new Error('Not authenticated')

      const inviteToken = generateInviteToken()

      // Create challenge
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .insert({
          user_id: user.id,
          name: data.name,
          start_date: data.start_date,
          duration_days: data.duration_days,
          invite_token: inviteToken,
        })
        .select()
        .single()

      if (challengeError) throw challengeError

      // Create tasks
      const tasksToInsert = data.tasks.map(task => ({
        ...task,
        challenge_id: challenge.id,
      }))

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToInsert)

      if (tasksError) throw tasksError

      return challenge as Challenge
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
      queryClient.invalidateQueries({ queryKey: ['challenges-with-stats'] })
    },
  })
}

// Update challenge
export function useUpdateChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Challenge> & { id: string }) => {
      const { data: challenge, error } = await supabase
        .from('challenges')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return challenge as Challenge
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
      queryClient.invalidateQueries({ queryKey: ['challenges-with-stats'] })
      queryClient.invalidateQueries({ queryKey: ['challenge', data.id] })
    },
  })
}

// Regenerate invite token
export function useRegenerateInviteToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (challengeId: string) => {
      const newToken = generateInviteToken()

      const { data, error } = await supabase
        .from('challenges')
        .update({ invite_token: newToken })
        .eq('id', challengeId)
        .select()
        .single()

      if (error) throw error
      return data as Challenge
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenge', data.id] })
    },
  })
}

// Join challenge via invite token
export function useJoinChallenge() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: async (inviteToken: string) => {
      if (!user) throw new Error('Not authenticated')

      // Find challenge by invite token
      const { data: challenge, error: findError } = await supabase
        .from('challenges')
        .select('id, user_id')
        .eq('invite_token', inviteToken)
        .single()

      if (findError) throw new Error('Invalid invite link')

      // Check if user is the owner
      if (challenge.user_id === user.id) {
        throw new Error('You are the owner of this challenge')
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('challenge_members')
        .select('id')
        .eq('challenge_id', challenge.id)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        throw new Error('You have already joined this challenge')
      }

      // Join challenge
      const { error: joinError } = await supabase
        .from('challenge_members')
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
        })

      if (joinError) throw joinError

      return challenge.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
      queryClient.invalidateQueries({ queryKey: ['challenges-with-stats'] })
    },
  })
}

// Fetch daily entry for a specific date
export function useDailyEntry(challengeId: string, date: string) {
  const { user } = useAuthContext()
  
  return useQuery({
    queryKey: ['daily-entry', challengeId, date, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('daily_entries')
        .select(`
          *,
          task_completions (*)
        `)
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)
        .eq('date', date)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!challengeId && !!date && !!user,
  })
}

// Save daily entry
export function useSaveDailyEntry() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: async (data: {
      challenge_id: string
      date: string
      note?: string
      image_url?: string
      task_completions: {
        task_id: string
        value: number
        is_completed: boolean
      }[]
    }) => {
      if (!user) throw new Error('Not authenticated')

      // Upsert daily entry
      const { data: entry, error: entryError } = await supabase
        .from('daily_entries')
        .upsert({
          challenge_id: data.challenge_id,
          user_id: user.id,
          date: data.date,
          note: data.note,
          image_url: data.image_url,
        }, {
          onConflict: 'challenge_id,user_id,date',
        })
        .select()
        .single()

      if (entryError) throw entryError

      // Delete existing task completions and insert new ones
      await supabase
        .from('task_completions')
        .delete()
        .eq('daily_entry_id', entry.id)

      if (data.task_completions.length > 0) {
        const completionsToInsert = data.task_completions.map(tc => ({
          ...tc,
          daily_entry_id: entry.id,
        }))

        const { error: completionsError } = await supabase
          .from('task_completions')
          .insert(completionsToInsert)

        if (completionsError) throw completionsError
      }

      return entry as DailyEntry
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-entry', data.challenge_id, data.date] })
      queryClient.invalidateQueries({ queryKey: ['daily-entries', data.challenge_id] })
      queryClient.invalidateQueries({ queryKey: ['progress-stats', data.challenge_id] })
      queryClient.invalidateQueries({ queryKey: ['challenges-with-stats'] })
    },
  })
}

// Fetch all daily entries for a challenge
export function useDailyEntries(challengeId: string) {
  const { user } = useAuthContext()
  
  return useQuery({
    queryKey: ['daily-entries', challengeId, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('daily_entries')
        .select(`
          *,
          task_completions (*)
        `)
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!challengeId && !!user,
  })
}

// Upload image to storage - requires userId to be passed
export async function uploadProgressImage(file: File, userId: string): Promise<string> {
  if (!userId) throw new Error('Not authenticated')

  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('progress-photos')
    .upload(fileName, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('progress-photos')
    .getPublicUrl(fileName)

  return data.publicUrl
}
