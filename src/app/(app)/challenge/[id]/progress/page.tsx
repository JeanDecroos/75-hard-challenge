'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useChallenge } from '@/hooks/use-challenges'
import { useProgressStats, useCalendarDays } from '@/hooks/use-progress'
import { 
  ArrowLeft,
  Flame,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  Target,
  BarChart3
} from 'lucide-react'
import { cn, getLocalDateString } from '@/lib/utils'

interface PageProps {
  params: {
    id: string
  }
}

export default function ProgressPage({ params }: PageProps) {
  const { data: challenge, isLoading: challengeLoading } = useChallenge(params.id)
  const { data: stats, isLoading: statsLoading } = useProgressStats(params.id)
  const { data: calendarDays, isLoading: calendarLoading } = useCalendarDays(params.id)

  if (challengeLoading || statsLoading || calendarLoading) {
    return <ProgressSkeleton />
  }

  if (!challenge || !stats) {
    return <div>Challenge not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{challenge.name}</h1>
          <p className="text-muted-foreground">Progress & Analytics</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Current Streak"
          value={stats.current_streak}
          suffix="days"
          color="text-orange-500"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Longest Streak"
          value={stats.longest_streak}
          suffix="days"
          color="text-blue-500"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Completed"
          value={stats.completed_days}
          suffix={`/ ${stats.total_days}`}
          color="text-green-500"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Completion Rate"
          value={stats.completion_percentage}
          suffix="%"
          color="text-primary"
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Task Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Challenge Calendar</CardTitle>
              <CardDescription>
                Track your daily progress throughout the challenge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChallengeCalendar 
                days={calendarDays || []} 
                challengeId={params.id}
              />
              <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-primary/20 border border-primary/30" />
                  <span className="text-muted-foreground">Completed</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive/30" />
                  <span className="text-muted-foreground">Missed</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-muted border border-border" />
                  <span className="text-muted-foreground">Upcoming</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-primary border-2 border-primary" />
                  <span className="text-muted-foreground">Today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Task Statistics</CardTitle>
              <CardDescription>
                See how you&apos;re performing on each task
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stats.task_stats.map((task, index) => (
                <motion.div
                  key={task.task_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <TaskStatItem task={task} />
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Missed Days Alert */}
      {stats.missed_days > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-6 flex items-start gap-4">
            <XCircle className="w-6 h-6 text-destructive shrink-0" />
            <div>
              <h4 className="font-semibold text-destructive">
                {stats.missed_days} day{stats.missed_days > 1 ? 's' : ''} missed
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Don&apos;t give up! Every day is a new opportunity to get back on track.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
  color: string
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className={`${color} mb-2`}>{icon}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{value}</span>
          {suffix && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}

function ChallengeCalendar({ 
  days, 
  challengeId 
}: { 
  days: { date: string; dayNumber: number; isCompleted: boolean; isMissed: boolean; isFuture: boolean; isToday: boolean }[]
  challengeId: string
}) {
  const today = getLocalDateString()

  return (
    <div className="grid grid-cols-7 gap-2">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
        <div key={i} className="text-center text-xs text-muted-foreground py-2">
          {day}
        </div>
      ))}
      
      {/* Add empty cells for alignment based on start day */}
      {days.length > 0 && (
        Array.from({ length: new Date(days[0].date).getDay() }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))
      )}
      
      {days.map((day) => (
        <Link
          key={day.date}
          href={`/challenge/${challengeId}/check-in/${day.date}`}
        >
          <div
            className={cn(
              'aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all cursor-pointer hover:scale-105',
              day.isCompleted && 'bg-primary/20 text-primary border border-primary/30',
              day.isMissed && 'bg-destructive/20 text-destructive border border-destructive/30',
              day.isFuture && 'bg-muted/50 text-muted-foreground',
              day.isToday && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
              !day.isCompleted && !day.isMissed && !day.isFuture && 'bg-secondary/50'
            )}
          >
            {day.dayNumber}
          </div>
        </Link>
      ))}
    </div>
  )
}

function TaskStatItem({ 
  task 
}: { 
  task: { task_id: string; label: string; total_completions: number; average_value: number; completion_rate: number }
}) {
  return (
    <div className="p-4 rounded-xl bg-secondary/50 border">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">{task.label}</span>
        <Badge variant={task.completion_rate >= 80 ? 'success' : task.completion_rate >= 50 ? 'warning' : 'destructive'}>
          {task.completion_rate}%
        </Badge>
      </div>
      <Progress value={task.completion_rate} className="h-2" />
      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
        <span>{task.total_completions} times completed</span>
        {task.average_value > 0 && (
          <span>Avg: {task.average_value.toFixed(1)}</span>
        )}
      </div>
    </div>
  )
}

function ProgressSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="w-8 h-8" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="glass-card">
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

