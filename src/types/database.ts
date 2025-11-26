export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          timezone: string | null
          reminder_enabled: boolean
          reminder_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          timezone?: string | null
          reminder_enabled?: boolean
          reminder_time?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          timezone?: string | null
          reminder_enabled?: boolean
          reminder_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      challenges: {
        Row: {
          id: string
          user_id: string
          name: string
          start_date: string
          duration_days: number
          invite_token: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          start_date: string
          duration_days?: number
          invite_token: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          start_date?: string
          duration_days?: number
          invite_token?: string
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          challenge_id: string
          label: string
          type: 'checkbox' | 'number'
          target_value: number
          unit: string | null
          is_required: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          label: string
          type: 'checkbox' | 'number'
          target_value: number
          unit?: string | null
          is_required?: boolean
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          label?: string
          type?: 'checkbox' | 'number'
          target_value?: number
          unit?: string | null
          is_required?: boolean
          position?: number
          created_at?: string
        }
      }
      daily_entries: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          date: string
          note: string | null
          image_url: string | null
          is_complete: boolean
          created_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          user_id: string
          date: string
          note?: string | null
          image_url?: string | null
          is_complete?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          user_id?: string
          date?: string
          note?: string | null
          image_url?: string | null
          is_complete?: boolean
          created_at?: string
        }
      }
      task_completions: {
        Row: {
          id: string
          daily_entry_id: string
          task_id: string
          value: number
          is_completed: boolean
        }
        Insert: {
          id?: string
          daily_entry_id: string
          task_id: string
          value: number
          is_completed: boolean
        }
        Update: {
          id?: string
          daily_entry_id?: string
          task_id?: string
          value?: number
          is_completed?: boolean
        }
      }
      challenge_members: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      fitness_providers: {
        Row: {
          id: string
          user_id: string
          provider: 'strava' | 'apple_health'
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          athlete_id: string | null
          connected_at: string
          last_sync_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          provider: 'strava' | 'apple_health'
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          athlete_id?: string | null
          connected_at?: string
          last_sync_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          provider?: 'strava' | 'apple_health'
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          athlete_id?: string | null
          connected_at?: string
          last_sync_at?: string | null
          is_active?: boolean
        }
      }
      fitness_activities: {
        Row: {
          id: string
          user_id: string
          provider: 'strava' | 'apple_health'
          provider_activity_id: string
          activity_type: string
          name: string | null
          start_date: string
          duration_seconds: number | null
          distance_meters: number | null
          calories_burned: number | null
          steps_count: number | null
          heart_rate_avg: number | null
          heart_rate_max: number | null
          raw_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: 'strava' | 'apple_health'
          provider_activity_id: string
          activity_type: string
          name?: string | null
          start_date: string
          duration_seconds?: number | null
          distance_meters?: number | null
          calories_burned?: number | null
          steps_count?: number | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          raw_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: 'strava' | 'apple_health'
          provider_activity_id?: string
          activity_type?: string
          name?: string | null
          start_date?: string
          duration_seconds?: number | null
          distance_meters?: number | null
          calories_burned?: number | null
          steps_count?: number | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          raw_data?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Derived types for easier use
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Challenge = Database['public']['Tables']['challenges']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type DailyEntry = Database['public']['Tables']['daily_entries']['Row']
export type TaskCompletion = Database['public']['Tables']['task_completions']['Row']
export type ChallengeMember = Database['public']['Tables']['challenge_members']['Row']

// Extended types with relations
export type ChallengeWithTasks = Challenge & {
  tasks: Task[]
}

export type DailyEntryWithCompletions = DailyEntry & {
  task_completions: TaskCompletion[]
}

export type ChallengeWithMembers = Challenge & {
  challenge_members: (ChallengeMember & {
    profiles: Profile
  })[]
}

export type MemberProgress = {
  user_id: string
  display_name: string
  completed_days: number
  total_days: number
  current_streak: number
}

export type FitnessProvider = Database['public']['Tables']['fitness_providers']['Row']
export type FitnessActivity = Database['public']['Tables']['fitness_activities']['Row']

