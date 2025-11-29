export * from './database'

export interface DefaultTask {
  label: string
  type: 'checkbox' | 'number'
  target_value: number
  unit: string | null
  is_required: boolean
  position: number
}

export const DEFAULT_TASKS: DefaultTask[] = [
  {
    label: 'Read 10 pages',
    type: 'number',
    target_value: 10,
    unit: 'pages',
    is_required: true,
    position: 0,
  },
  {
    label: 'Walk 5,000 steps',
    type: 'number',
    target_value: 5000,
    unit: 'steps',
    is_required: true,
    position: 1,
  },
  {
    label: 'Eat 2 healthy meals',
    type: 'number',
    target_value: 2,
    unit: 'meals',
    is_required: true,
    position: 2,
  },
  {
    label: 'Drink 2.5L water',
    type: 'number',
    target_value: 2.5,
    unit: 'L',
    is_required: true,
    position: 3,
  },
]

export interface ChallengeFormData {
  name: string
  start_date: string
  duration_days: number
  tasks: DefaultTask[]
}

export interface CheckInFormData {
  note: string
  image?: File
  task_completions: {
    task_id: string
    value: number
    is_completed: boolean
  }[]
}

export interface ProgressStats {
  total_days: number
  completed_days: number
  missed_days: number
  current_streak: number
  longest_streak: number
  completion_percentage: number
  days_remaining: number
  task_stats: TaskStat[]
}

export interface TaskStat {
  task_id: string
  label: string
  total_completions: number
  average_value: number
  completion_rate: number
}

export interface CalendarDay {
  date: string
  dayNumber: number
  isCompleted: boolean
  isMissed: boolean
  isFuture: boolean
  isToday: boolean
}

