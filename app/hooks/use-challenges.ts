'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Challenge, ChallengeWithTasks, Task, DailyEntry, TaskCompletion } from '@/types'
import { generateInviteToken } from '@/lib/utils'

const supabase = createClient()

// Fetch user's challenges
export function useChallenges() {
  return useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get challenges user owns (without nested tasks to avoid RLS recursion)
      const { data: ownedChallenges, error: ownedError } = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (ownedError) {
        console.error('Error fetching owned challenges:', ownedError)
        throw ownedError
      }

      // Fetch tasks separately for each challenge to avoid RLS recursion
      if (ownedChallenges && ownedChallenges.length > 0) {
        const challengeIds = ownedChallenges.map(c => c.id)
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('challenge_id', challengeIds)

        if (tasksError) {
          console.error('Error fetching tasks:', tasksError)
          throw tasksError
        }

        // Attach tasks to their challenges
        ownedChallenges.forEach(challenge => {
          (challenge as ChallengeWithTasks).tasks = tasks?.filter(t => t.challenge_id === challenge.id) || []
        })
      }

      // Get challenges user is a member of (without nested tasks)
      const { data: memberChallenges, error: memberError } = await supabase
        .from('challenge_members')
        .select(`
          challenge:challenges (*)
        `)
        .eq('user_id', user.id)

      if (memberError) throw memberError

      const joinedChallenges = (memberChallenges
        ?.map((m: any) => m.challenge as Challenge)
        .filter(Boolean) || []) as Challenge[]

      // Fetch tasks separately for member challenges
      if (joinedChallenges.length > 0) {
        const memberChallengeIds = joinedChallenges.map(c => c.id)
        const { data: memberTasks, error: memberTasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('challenge_id', memberChallengeIds)

        if (memberTasksError) {
          console.error('Error fetching member tasks:', memberTasksError)
          throw memberTasksError
        }

        // Attach tasks to their challenges
        joinedChallenges.forEach(challenge => {
          (challenge as ChallengeWithTasks).tasks = memberTasks?.filter(t => t.challenge_id === challenge.id) || []
        })
      }

      const joinedChallengesWithTasks = joinedChallenges as ChallengeWithTasks[]

      return [...(ownedChallenges || []), ...joinedChallengesWithTasks] as ChallengeWithTasks[]
    },
  })
}

// Fetch single challenge with tasks
export function useChallenge(id: string) {
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
    enabled: !!id,
  })
}

// Create a new challenge
export function useCreateChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      start_date: string
      duration_days: number
      tasks: Omit<Task, 'id' | 'challenge_id' | 'created_at'>[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
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

  return useMutation({
    mutationFn: async (inviteToken: string) => {
      const { data: { user } } = await supabase.auth.getUser()
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
    },
  })
}

// Fetch daily entry for a specific date
export function useDailyEntry(challengeId: string, date: string) {
  return useQuery({
    queryKey: ['daily-entry', challengeId, date],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
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
    enabled: !!challengeId && !!date,
  })
}

// Save daily entry
export function useSaveDailyEntry() {
  const queryClient = useQueryClient()

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
      const { data: { user } } = await supabase.auth.getUser()
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
    },
  })
}

// Fetch all daily entries for a challenge
export function useDailyEntries(challengeId: string) {
  return useQuery({
    queryKey: ['daily-entries', challengeId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
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
    enabled: !!challengeId,
  })
}

// Upload image to storage
export async function uploadProgressImage(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('progress-photos')
    .upload(fileName, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('progress-photos')
    .getPublicUrl(fileName)

  return data.publicUrl
}

