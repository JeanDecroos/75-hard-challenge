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
 * Matches tasks to activities based on:
 * 1. Activity type (e.g., "run" task matches "run" activity)
 * 2. Task units (e.g., "min" matches duration, "km" matches distance)
 * 3. Task label keywords (e.g., "workout" in label matches any activity)
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

  // For each task, try to automatically match it to fitness data
  tasks.forEach(task => {
    let value = 0
    let isCompleted = false

    // Only auto-populate for number tasks
    if (task.type === 'number') {
      // Try to match based on activity type and task label first
      const matchedValue = matchTaskToActivities(task, fitnessMetrics.activities)
      
      if (matchedValue > 0) {
        // If we found a match based on activity type, use that
        value = matchedValue
      } else if (task.unit) {
        // Otherwise, fall back to unit-based matching
        value = getFitnessValueForTask(fitnessMetrics, task)
      }
      
      // Mark as completed if value meets or exceeds target
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
 * Match a task to specific activities based on activity type and task label
 * Returns the best matching value (e.g., duration in minutes for a "30 min workout" task)
 */
function matchTaskToActivities(task: Task, activities: FitnessActivity[]): number {
  if (!activities || activities.length === 0) return 0

  const taskLabel = task.label.toLowerCase()
  const taskUnit = task.unit?.toLowerCase() || ''

  // Extract activity type keywords from task label
  const activityKeywords = ['run', 'walk', 'ride', 'bike', 'cycle', 'swim', 'hike', 'workout', 'exercise', 'training', 'activity']
  const matchedKeyword = activityKeywords.find(keyword => taskLabel.includes(keyword))

  // Find activities that match the task
  const matchingActivities = activities.filter(activity => {
    const activityType = activity.activity_type?.toLowerCase() || ''
    
    // If task mentions a specific activity type, match it
    if (matchedKeyword) {
      // Map task keywords to Strava activity types
      const keywordMap: Record<string, string[]> = {
        'run': ['run', 'running'],
        'walk': ['walk', 'walking', 'hike', 'hiking'],
        'ride': ['ride', 'virtualride', 'ebikeride'],
        'bike': ['ride', 'virtualride', 'ebikeride'],
        'cycle': ['ride', 'virtualride', 'ebikeride'],
        'swim': ['swim', 'swimming'],
        'hike': ['hike', 'hiking', 'walk', 'walking'],
        'workout': ['workout', 'weighttraining', 'crossfit', 'strength'],
        'exercise': ['workout', 'weighttraining', 'crossfit', 'strength'],
        'training': ['workout', 'weighttraining', 'crossfit', 'strength'],
        'activity': [] // Matches any activity
      }

      const matchingTypes = keywordMap[matchedKeyword] || []
      if (matchingTypes.length === 0) return true // "activity" matches everything
      return matchingTypes.some(type => activityType.includes(type))
    }

    // If no specific keyword, match any activity
    return true
  })

  if (matchingActivities.length === 0) return 0

  // Calculate the value based on the task unit
  let totalValue = 0

  matchingActivities.forEach(activity => {
    if (taskUnit.includes('min') || taskUnit.includes('minute') || taskUnit.includes('time')) {
      // Duration-based task
      totalValue += (activity.duration_seconds || 0) / 60
    } else if (taskUnit.includes('km') || taskUnit.includes('kilometer') || taskUnit.includes('distance')) {
      // Distance-based task
      totalValue += (activity.distance_meters || 0) / 1000
    } else if (taskUnit.includes('mile') || taskUnit === 'mi') {
      // Distance in miles
      totalValue += ((activity.distance_meters || 0) / 1000) * 0.621371
    } else if (taskUnit.includes('meter') || taskUnit === 'm') {
      // Distance in meters
      totalValue += activity.distance_meters || 0
    } else if (taskUnit.includes('step')) {
      // Steps
      totalValue += activity.steps_count || 0
    } else if (taskUnit.includes('calorie') || taskUnit === 'cal' || taskUnit === 'kcal') {
      // Calories
      totalValue += activity.calories_burned || 0
    } else if (taskUnit.includes('hour') || taskUnit === 'hr' || taskUnit === 'hrs') {
      // Duration in hours
      totalValue += (activity.duration_seconds || 0) / 3600
    } else {
      // Default: use duration in minutes for generic "workout" or "exercise" tasks
      totalValue += (activity.duration_seconds || 0) / 60
    }
  })

  // Round appropriately based on unit
  if (taskUnit.includes('min') || taskUnit.includes('minute')) {
    return Math.round(totalValue)
  } else if (taskUnit.includes('hour') || taskUnit === 'hr' || taskUnit === 'hrs') {
    return Math.round(totalValue * 10) / 10
  } else if (taskUnit.includes('km') || taskUnit.includes('kilometer')) {
    return Math.round(totalValue * 10) / 10
  } else if (taskUnit.includes('mile') || taskUnit === 'mi') {
    return Math.round(totalValue * 10) / 10
  }

  return Math.round(totalValue)
}

/**
 * Automatically match task units to fitness metrics
 */
function getFitnessValueForTask(fitnessMetrics: any, task: Task): number {
  const unit = task.unit?.toLowerCase()

  if (!unit) return 0

  // Distance units
  if (unit.includes('km') || unit.includes('kilometer') || unit.includes('distance')) {
    return Math.round((fitnessMetrics.total_distance_meters / 1000) * 10) / 10 // Convert meters to km with 1 decimal
  }

  if (unit.includes('mile') || unit === 'mi') {
    return Math.round(((fitnessMetrics.total_distance_meters / 1000) * 0.621371) * 10) / 10 // Convert meters to miles with 1 decimal
  }

  if (unit.includes('meter') || unit === 'm') {
    return Math.round(fitnessMetrics.total_distance_meters)
  }

  // Time units
  if (unit.includes('minute') || unit === 'min' || unit === 'mins' || unit.includes('time')) {
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
