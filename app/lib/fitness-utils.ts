import { createClient } from '@/lib/supabase/client'
import { FitnessActivity, Task } from '@/types'

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
 * Auto-populate task completions based on Strava activity data
 * Simplified approach: automatically match task units to fitness metrics
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
  const fitnessMetrics = await getFitnessMetricsForDate(userId, date)

  const taskCompletions: Array<{
    task_id: string
    value: number
    is_completed: boolean
  }> = []

  // For each task, try to automatically match it to fitness data based on units
  tasks.forEach(task => {
    let value = 0
    let isCompleted = false

    // Only auto-populate for number tasks with compatible units
    if (task.type === 'number' && task.unit) {
      value = getFitnessValueForTask(fitnessMetrics, task)
      isCompleted = value >= task.target_value
    }

    taskCompletions.push({
      task_id: task.id,
      value,
      is_completed: isCompleted,
    })
  })

  return taskCompletions
}

/**
 * Automatically match task units to fitness metrics
 */
function getFitnessValueForTask(fitnessMetrics: any, task: Task): number {
  const unit = task.unit?.toLowerCase()

  if (!unit) return 0

  // Distance units
  if (unit.includes('km') || unit.includes('kilometer')) {
    return Math.round(fitnessMetrics.total_distance_meters / 1000) // Convert meters to km
  }

  if (unit.includes('mile') || unit === 'mi') {
    return Math.round((fitnessMetrics.total_distance_meters / 1000) * 0.621371) // Convert meters to miles
  }

  if (unit.includes('meter') || unit === 'm') {
    return fitnessMetrics.total_distance_meters
  }

  // Time units
  if (unit.includes('minute') || unit === 'min' || unit === 'mins') {
    return Math.round(fitnessMetrics.total_duration_seconds / 60) // Convert seconds to minutes
  }

  if (unit.includes('hour') || unit === 'hr' || unit === 'hrs') {
    return Math.round(fitnessMetrics.total_duration_seconds / 3600 * 10) / 10 // Convert to hours with 1 decimal
  }

  // Steps
  if (unit.includes('step')) {
    return fitnessMetrics.total_steps
  }

  // Calories
  if (unit.includes('calorie') || unit === 'cal' || unit === 'kcal') {
    return fitnessMetrics.total_calories
  }

  // Exercise/fitness related terms - map to duration
  if (unit.includes('exercise') || unit.includes('workout') || unit.includes('training')) {
    return Math.round(fitnessMetrics.total_duration_seconds / 60) // Convert to minutes
  }

  return 0 // No matching unit found
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
