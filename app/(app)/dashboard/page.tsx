'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useChallengesWithStats, type ChallengeWithStats } from '@/hooks/use-challenges'
import { 
  Flame, 
  Calendar, 
  Target, 
  TrendingUp,
  ChevronRight,
  Plus,
  CheckCircle2
} from 'lucide-react'
import { getLocalDateString, getDayNumber } from '@/lib/utils'

export default function DashboardPage() {
  // OPTIMIZED: Single query fetches ALL challenges with stats
  const { data: challenges, isLoading } = useChallengesWithStats()

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (!challenges || challenges.length === 0) {
    return <EmptyDashboard />
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Track your progress and stay on course</p>
        </div>
        <Link href="/onboarding">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            New Challenge
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {challenges.map((challenge, index) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ChallengeCard challenge={challenge} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// OPTIMIZED: Stats are now included in the challenge data - no separate fetch!
function ChallengeCard({ challenge }: { challenge: ChallengeWithStats }) {
  const today = getLocalDateString()
  const dayNumber = getDayNumber(challenge.start_date, today)
  const isActive = dayNumber > 0 && dayNumber <= challenge.duration_days
  const stats = challenge.stats

  return (
    <Card className="glass-card hover:bg-white/10 transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              {challenge.name}
              {isActive && (
                <Badge variant="success" className="ml-2">Active</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Day {Math.min(dayNumber, challenge.duration_days)} of {challenge.duration_days}
            </CardDescription>
          </div>
          <Link href={`/challenge/${challenge.id}/check-in/${today}`}>
            <Button className="gap-2 glow-sm">
              <CheckCircle2 className="w-4 h-4" />
              Check In
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{stats?.completion_percentage || 0}%</span>
          </div>
          <Progress value={stats?.completion_percentage || 0} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Flame className="w-5 h-5" />}
            label="Current Streak"
            value={`${stats?.current_streak || 0} days`}
            color="text-orange-500"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Longest Streak"
            value={`${stats?.longest_streak || 0} days`}
            color="text-blue-500"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Completed Days"
            value={`${stats?.completed_days || 0}`}
            color="text-green-500"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="Days Remaining"
            value={`${stats?.days_remaining || 0}`}
            color="text-purple-500"
          />
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href={`/challenge/${challenge.id}/progress`}>
            <Button variant="outline" size="sm" className="gap-1">
              <Target className="w-4 h-4" />
              View Progress
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/challenge/${challenge.id}/friends`}>
            <Button variant="outline" size="sm" className="gap-1">
              Friends
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/challenge/${challenge.id}/settings`}>
            <Button variant="ghost" size="sm" className="gap-1">
              Settings
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="p-4 rounded-xl bg-secondary/50 border">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
        <Flame className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">No Challenges Yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Create your first challenge to start tracking your progress and 
        building unbreakable habits.
      </p>
      <Link href="/onboarding">
        <Button size="lg" className="gap-2 glow">
          <Plus className="w-5 h-5" />
          Create Your First Challenge
        </Button>
      </Link>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-24" />
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
