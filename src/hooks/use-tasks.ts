'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types'

const supabase = createClient()

// Create a new task
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Task, 'id' | 'created_at'>) => {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return task as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenge', data.challenge_id] })
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
      queryClient.invalidateQueries({ queryKey: ['challenges-with-stats'] })
    },
  })
}

// Update a task
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Task> & { id: string }) => {
      const { data: task, error } = await supabase
        .from('tasks')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return task as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenge', data.challenge_id] })
    },
  })
}

// Delete a task
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, challengeId }: { id: string; challengeId: string }) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id, challengeId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenge', data.challengeId] })
    },
  })
}

// Reorder tasks
export function useReorderTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { challengeId: string; tasks: { id: string; position: number }[] }) => {
      const updates = data.tasks.map(task =>
        supabase
          .from('tasks')
          .update({ position: task.position })
          .eq('id', task.id)
      )

      await Promise.all(updates)
      return data.challengeId
    },
    onSuccess: (challengeId) => {
      queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] })
    },
  })
}

