import { createClient } from '@/lib/supabase/client'
import { FitnessActivity, FitnessTaskMapping, Task, TaskCompletion } from '@/types'

const supabase = createClient()

/**
 * Calculate fitness metrics for a specific date from stored activities
 */
export async function getFitnessMetricsForDate(
  userId: string,
  date: string
): Promise<{
  total_distance_meters: number
  total_duration_seconds: number
  total_steps: number
  total_calories: number
  activities: FitnessActivity[]
}> {
  // Get start and end of the day
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const { data: activities, error } = await supabase
    .from('fitness_activities')
    .select('*')
    .eq('user_id', userId)
    .gte('start_date', startOfDay.toISOString())
    .lte('start_date', endOfDay.toISOString())

  if (error) throw error

  const metrics = {
    total_distance_meters: 0,
    total_duration_seconds: 0,
    total_steps: 0,
    total_calories: 0,
    activities: activities || [],
  }

  // Aggregate metrics from activities
  activities?.forEach(activity => {
    metrics.total_distance_meters += activity.distance_meters || 0
    metrics.total_duration_seconds += activity.duration_seconds || 0
    metrics.total_steps += activity.steps_count || 0
    metrics.total_calories += activity.calories_burned || 0
  })

  return metrics
}

/**
 * Auto-populate task completions based on fitness mappings
 */
export async function autoPopulateTaskCompletions(
  userId: string,
  challengeId: string,
  date: string,
  tasks: Task[]
): Promise<Array<{
  task_id: string
  value: number
  is_completed: boolean
}>> {
  const [fitnessMetrics, taskMappings] = await Promise.all([
    getFitnessMetricsForDate(userId, date),
    getFitnessTaskMappings(challengeId),
  ])

  const taskCompletions: Array<{
    task_id: string
    value: number
    is_completed: boolean
  }> = []

  // For each task, check if there's a fitness mapping and populate accordingly
  tasks.forEach(task => {
    const mapping = taskMappings.find(m => m.task_id === task.id)

    if (mapping) {
      let value = 0

      // Calculate value based on mapping metric
      switch (mapping.metric) {
        case 'distance':
          value = Math.round((fitnessMetrics.total_distance_meters / 1000) * mapping.multiplier) // Convert to km
          break
        case 'duration':
          value = Math.round((fitnessMetrics.total_duration_seconds / 60) * mapping.multiplier) // Convert to minutes
          break
        case 'steps':
          value = Math.round(fitnessMetrics.total_steps * mapping.multiplier)
          break
        case 'calories':
          value = Math.round(fitnessMetrics.total_calories * mapping.multiplier)
          break
      }

      // Check if task is completed based on target value
      const isCompleted = value >= task.target_value

      taskCompletions.push({
        task_id: task.id,
        value,
        is_completed: isCompleted,
      })
    } else {
      // No mapping, leave as default (0, not completed)
      taskCompletions.push({
        task_id: task.id,
        value: 0,
        is_completed: false,
      })
    }
  })

  return taskCompletions
}

/**
 * Get fitness task mappings for a challenge
 */
export async function getFitnessTaskMappings(challengeId: string): Promise<FitnessTaskMapping[]> {
  const { data, error } = await supabase
    .from('fitness_task_mappings')
    .select(`
      *,
      tasks!inner(challenge_id)
    `)
    .eq('tasks.challenge_id', challengeId)

  if (error) throw error
  return data || []
}

/**
 * Create a fitness task mapping
 */
export async function createFitnessTaskMapping(
  taskId: string,
  activityType: string,
  metric: 'distance' | 'duration' | 'steps' | 'calories',
  multiplier: number = 1
): Promise<FitnessTaskMapping> {
  const { data, error } = await supabase
    .from('fitness_task_mappings')
    .insert({
      task_id: taskId,
      activity_type: activityType,
      metric,
      multiplier,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a fitness task mapping
 */
export async function deleteFitnessTaskMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('fitness_task_mappings')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Get activity type suggestions based on common fitness activities
 */
export function getActivityTypeSuggestions(): Array<{
  value: string
  label: string
  metrics: string[]
}> {
  return [
    { value: 'run', label: 'Running', metrics: ['distance', 'duration', 'calories'] },
    { value: 'walk', label: 'Walking', metrics: ['distance', 'duration', 'steps', 'calories'] },
    { value: 'ride', label: 'Cycling', metrics: ['distance', 'duration', 'calories'] },
    { value: 'swim', label: 'Swimming', metrics: ['distance', 'duration', 'calories'] },
    { value: 'hike', label: 'Hiking', metrics: ['distance', 'duration', 'calories'] },
    { value: 'workout', label: 'Workout', metrics: ['duration', 'calories'] },
    { value: 'yoga', label: 'Yoga', metrics: ['duration'] },
    { value: 'dance', label: 'Dance', metrics: ['duration', 'calories'] },
  ]
}
