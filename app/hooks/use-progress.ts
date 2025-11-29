'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ProgressStats, CalendarDay, ChallengeWithTasks } from '@/types'
import { calculateStreak, isToday, isFutureDate, getLocalDateString } from '@/lib/utils'

const supabase = createClient()

export function useProgressStats(challengeId: string) {
  return useQuery({
    queryKey: ['progress-stats', challengeId],
    queryFn: async (): Promise<ProgressStats> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get challenge details
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select(`
          *,
          tasks (*)
        `)
        .eq('id', challengeId)
        .single()

      if (challengeError) throw challengeError

      // Get all daily entries
      const { data: entries, error: entriesError } = await supabase
        .from('daily_entries')
        .select(`
          *,
          task_completions (*)
        `)
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)

      if (entriesError) throw entriesError

      const typedChallenge = challenge as ChallengeWithTasks
      const tasks = typedChallenge.tasks || []
      const completedDates = entries
        ?.filter(e => e.is_complete)
        .map(e => e.date) || []

      // Calculate days
      const startDate = new Date(typedChallenge.start_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const totalDays = typedChallenge.duration_days
      const elapsedDays = Math.min(Math.max(daysSinceStart, 0), totalDays)
      const completedDays = completedDates.length
      const missedDays = Math.max(elapsedDays - completedDays - (isToday(startDate) ? 0 : 1), 0)
      const daysRemaining = Math.max(totalDays - elapsedDays, 0)

      // Calculate streaks
      const { current, longest } = calculateStreak(completedDates, typedChallenge.start_date)

      // Calculate task stats
      const taskStats = tasks.map(task => {
        const completions = entries?.flatMap(e => 
          e.task_completions?.filter((tc: { task_id: string; is_completed: boolean; value: number }) => 
            tc.task_id === task.id && tc.is_completed
          ) || []
        ) || []

        const totalCompletions = completions.length
        const totalValue = completions.reduce((sum: number, tc: { value: number }) => sum + tc.value, 0)
        const averageValue = totalCompletions > 0 ? totalValue / totalCompletions : 0
        const completionRate = elapsedDays > 0 ? (totalCompletions / elapsedDays) * 100 : 0

        return {
          task_id: task.id,
          label: task.label,
          total_completions: totalCompletions,
          average_value: averageValue,
          completion_rate: Math.round(completionRate),
        }
      })

      return {
        total_days: totalDays,
        completed_days: completedDays,
        missed_days: missedDays,
        current_streak: current,
        longest_streak: longest,
        completion_percentage: elapsedDays > 0 ? Math.round((completedDays / elapsedDays) * 100) : 0,
        days_remaining: daysRemaining,
        task_stats: taskStats,
      }
    },
    enabled: !!challengeId,
  })
}

export function useCalendarDays(challengeId: string) {
  return useQuery({
    queryKey: ['calendar-days', challengeId],
    queryFn: async (): Promise<CalendarDay[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get challenge details
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('start_date, duration_days')
        .eq('id', challengeId)
        .single()

      if (challengeError) throw challengeError

      // Get all daily entries
      const { data: entries, error: entriesError } = await supabase
        .from('daily_entries')
        .select('date, is_complete')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)

      if (entriesError) throw entriesError

      const completedDatesSet = new Set(
        entries?.filter(e => e.is_complete).map(e => e.date) || []
      )

      const startDate = new Date(challenge.start_date)
      const days: CalendarDay[] = []

      for (let i = 0; i < challenge.duration_days; i++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + i)
        const dateStr = getLocalDateString(currentDate)

        days.push({
          date: dateStr,
          dayNumber: i + 1,
          isCompleted: completedDatesSet.has(dateStr),
          isMissed: !completedDatesSet.has(dateStr) && !isFutureDate(currentDate) && !isToday(currentDate),
          isFuture: isFutureDate(currentDate),
          isToday: isToday(currentDate),
        })
      }

      return days
    },
    enabled: !!challengeId,
  })
}

export function useChallengeMembers(challengeId: string) {
  return useQuery({
    queryKey: ['challenge-members', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_members')
        .select(`
          *,
          profiles (
            id,
            display_name
          )
        `)
        .eq('challenge_id', challengeId)

      if (error) throw error

      // Get daily entries for each member
      const memberProgress = await Promise.all(
        data.map(async (member) => {
          const { data: entries } = await supabase
            .from('daily_entries')
            .select('date, is_complete')
            .eq('challenge_id', challengeId)
            .eq('user_id', member.user_id)

          const completedDates = entries?.filter(e => e.is_complete).map(e => e.date) || []
          const { current } = calculateStreak(completedDates, new Date().toISOString())

          return {
            user_id: member.user_id,
            display_name: member.profiles?.display_name || 'Anonymous',
            completed_days: completedDates.length,
            current_streak: current,
            joined_at: member.joined_at,
          }
        })
      )

      return memberProgress
    },
    enabled: !!challengeId,
  })
}

