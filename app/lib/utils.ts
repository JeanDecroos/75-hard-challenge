import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatShortDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function getDayNumber(startDate: Date | string, currentDate: Date | string): number {
  const start = new Date(startDate)
  const current = new Date(currentDate)
  const diffTime = current.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1
}

export function getDateFromDayNumber(startDate: Date | string, dayNumber: number): Date {
  const start = new Date(startDate)
  const result = new Date(start)
  result.setDate(result.getDate() + dayNumber - 1)
  return result
}

export function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function calculateStreak(completedDates: string[], startDate: string): { current: number; longest: number } {
  if (completedDates.length === 0) return { current: 0, longest: 0 }

  const sortedDates = [...completedDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 1

  // Check if the most recent completed date is today or yesterday
  const mostRecent = new Date(sortedDates[0])
  mostRecent.setHours(0, 0, 0, 0)
  const diffFromToday = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24))

  if (diffFromToday > 1) {
    currentStreak = 0
  } else {
    currentStreak = 1
    for (let i = 1; i < sortedDates.length; i++) {
      const current = new Date(sortedDates[i - 1])
      const previous = new Date(sortedDates[i])
      const diff = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24))
      if (diff === 1) {
        currentStreak++
      } else {
        break
      }
    }
  }

  // Calculate longest streak
  const chronologicalDates = [...completedDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  for (let i = 1; i < chronologicalDates.length; i++) {
    const current = new Date(chronologicalDates[i])
    const previous = new Date(chronologicalDates[i - 1])
    const diff = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak)

  return { current: currentStreak, longest: longestStreak }
}

export function calculateCompletionPercentage(completedDays: number, totalDays: number): number {
  if (totalDays === 0) return 0
  return Math.round((completedDays / totalDays) * 100)
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-500'
  if (percentage >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

export function isToday(date: Date | string): boolean {
  const d = new Date(date)
  const today = new Date()
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}

export function isFutureDate(date: Date | string): boolean {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d > today
}

export function isPastDate(date: Date | string): boolean {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

export function getLocalDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

export function timezones(): { value: string; label: string }[] {
  return [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  ]
}

