'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthContext } from '@/components/providers'
import type { ProgressStats, CalendarDay, ChallengeWithTasks } from '@/types'
import { calculateStreak, isToday, isFutureDate, getLocalDateString } from '@/lib/utils'

const supabase = createClient()

export function useProgressStats(challengeId: string) {
  const { user } = useAuthContext()
  
  return useQuery({
    queryKey: ['progress-stats', challengeId, user?.id],
    queryFn: async (): Promise<ProgressStats> => {
      if (!user) throw new Error('Not authenticated')

      // PARALLEL FETCH: Get challenge and entries simultaneously
      const [challengeResult, entriesResult] = await Promise.all([
        supabase
          .from('challenges')
          .select(`*, tasks (*)`)
          .eq('id', challengeId)
          .single(),
        supabase
          .from('daily_entries')
          .select(`*, task_completions (*)`)
          .eq('challenge_id', challengeId)
          .eq('user_id', user.id)
      ])

      if (challengeResult.error) throw challengeResult.error
      if (entriesResult.error) throw entriesResult.error

      const typedChallenge = challengeResult.data as ChallengeWithTasks
      const entries = entriesResult.data || []
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
    enabled: !!challengeId && !!user,
  })
}

export function useCalendarDays(challengeId: string) {
  const { user } = useAuthContext()
  
  return useQuery({
    queryKey: ['calendar-days', challengeId, user?.id],
    queryFn: async (): Promise<CalendarDay[]> => {
      if (!user) throw new Error('Not authenticated')

      // PARALLEL FETCH: Get challenge and entries simultaneously
      const [challengeResult, entriesResult] = await Promise.all([
        supabase
          .from('challenges')
          .select('start_date, duration_days')
          .eq('id', challengeId)
          .single(),
        supabase
          .from('daily_entries')
          .select('date, is_complete')
          .eq('challenge_id', challengeId)
          .eq('user_id', user.id)
      ])

      if (challengeResult.error) throw challengeResult.error
      if (entriesResult.error) throw entriesResult.error

      const challenge = challengeResult.data
      const entries = entriesResult.data || []

      const completedDatesSet = new Set(
        entries.filter(e => e.is_complete).map(e => e.date)
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
    enabled: !!challengeId && !!user,
  })
}

export function useChallengeMembers(challengeId: string) {
  const { user } = useAuthContext()
  
  return useQuery({
    queryKey: ['challenge-members', challengeId],
    queryFn: async () => {
      // Get members with profiles
      const { data: members, error: membersError } = await supabase
        .from('challenge_members')
        .select(`
          *,
          profiles (
            id,
            display_name
          )
        `)
        .eq('challenge_id', challengeId)

      if (membersError) throw membersError
      if (!members || members.length === 0) return []

      // Get all member user IDs
      const memberUserIds = members.map(m => m.user_id)

      // BATCH FETCH: Get all daily entries for all members in one query
      const { data: allEntries, error: entriesError } = await supabase
        .from('daily_entries')
        .select('user_id, date, is_complete')
        .eq('challenge_id', challengeId)
        .in('user_id', memberUserIds)

      if (entriesError) throw entriesError

      // Process member progress from batched data
      const memberProgress = members.map(member => {
        const memberEntries = allEntries?.filter(e => e.user_id === member.user_id) || []
        const completedDates = memberEntries.filter(e => e.is_complete).map(e => e.date)
        const { current } = calculateStreak(completedDates, new Date().toISOString())

        return {
          user_id: member.user_id,
          display_name: member.profiles?.display_name || 'Anonymous',
          completed_days: completedDates.length,
          current_streak: current,
          joined_at: member.joined_at,
        }
      })

      return memberProgress
    },
    enabled: !!challengeId && !!user,
  })
}

