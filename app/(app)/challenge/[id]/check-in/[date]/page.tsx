'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useChallenge, useDailyEntry, useSaveDailyEntry, uploadProgressImage } from '@/hooks/use-challenges'
import { autoPopulateTaskCompletions } from '@/lib/fitness-utils'
import { useFitnessActivities } from '@/hooks/use-fitness'
import type { Task, TaskCompletion } from '@/types'
import { 
  CheckCircle2, 
  Upload, 
  X, 
  Loader2,
  ImageIcon,
  Calendar,
  ArrowLeft,
  Sparkles,
  Activity,
  ExternalLink
} from 'lucide-react'
import { formatDate, getDayNumber } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

interface PageProps {
  params: {
    id: string
    date: string
  }
}

export default function CheckInPage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { data: challenge, isLoading: challengeLoading } = useChallenge(params.id)
  const { data: existingEntry, isLoading: entryLoading } = useDailyEntry(params.id, params.date)
  const { data: fitnessActivities, isLoading: activitiesLoading } = useFitnessActivities(params.date)
  const saveDailyEntry = useSaveDailyEntry()

  const [note, setNote] = useState(existingEntry?.note || '')
  const [imageUrl, setImageUrl] = useState<string | null>(existingEntry?.image_url || null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [taskCompletions, setTaskCompletions] = useState<Map<string, { value: number; is_completed: boolean }>>(new Map())

  // Initialize task completions from existing entry
  useState(() => {
    if (existingEntry?.task_completions) {
      const completions = new Map<string, { value: number; is_completed: boolean }>()
      existingEntry.task_completions.forEach((tc: TaskCompletion) => {
        completions.set(tc.task_id, { value: tc.value, is_completed: tc.is_completed })
      })
      setTaskCompletions(completions)
    }
  })

  // Track if we've already auto-populated to avoid infinite loops
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false)

  // Auto-populate task completions from fitness data
  // Uses Strava activities to automatically complete matching tasks
  useEffect(() => {
    const initializeFromFitness = async () => {
      if (!challenge?.tasks) return
      if (hasAutoPopulated) return // Don't run multiple times
      
      // Wait for fitness activities to load
      if (activitiesLoading) return

      try {
        const autoCompletions = await autoPopulateTaskCompletions(
          challenge.user_id,
          params.id,
          params.date,
          challenge.tasks
        )

        // Only update if we have Strava data that can complete tasks
        const hasCompletableTasks = autoCompletions.some(c => c.is_completed && c.value > 0)
        if (!hasCompletableTasks && (!fitnessActivities || fitnessActivities.length === 0)) {
          return
        }

        const completionsMap = new Map(taskCompletions)
        
        autoCompletions.forEach(completion => {
          // If Strava shows the task should be completed, update it
          // This will auto-complete tasks based on Strava activities
          const existing = completionsMap.get(completion.task_id)
          
          if (completion.is_completed && completion.value > 0) {
            // Strava data shows this task should be completed
            completionsMap.set(completion.task_id, {
              value: completion.value,
              is_completed: true,
            })
          } else if (!existing && completion.value > 0) {
            // Set the value even if not completed (user can see progress)
            completionsMap.set(completion.task_id, {
              value: completion.value,
              is_completed: false,
            })
          } else if (existing && completion.value > existing.value) {
            // Update to higher value from Strava
            completionsMap.set(completion.task_id, {
              value: completion.value,
              is_completed: completion.is_completed || existing.is_completed,
            })
          }
        })
        
        setTaskCompletions(completionsMap)
        setHasAutoPopulated(true)
      } catch (error) {
        console.error('Failed to auto-populate from fitness data:', error)
      }
    }

    initializeFromFitness()
  }, [existingEntry, challenge, params.id, params.date, fitnessActivities, activitiesLoading, hasAutoPopulated])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const url = await uploadProgressImage(file)
      setImageUrl(url)
      toast({
        title: 'Image uploaded!',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image',
        variant: 'destructive',
      })
    } finally {
      setUploadingImage(false)
    }
  }, [toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  })

  const handleTaskChange = (taskId: string, task: Task, value: number | boolean) => {
    const completion = taskCompletions.get(taskId) || { value: 0, is_completed: false }
    
    if (task.type === 'checkbox') {
      setTaskCompletions(new Map(taskCompletions.set(taskId, {
        value: value ? 1 : 0,
        is_completed: !!value,
      })))
    } else {
      const numValue = typeof value === 'number' ? value : 0
      setTaskCompletions(new Map(taskCompletions.set(taskId, {
        value: numValue,
        is_completed: numValue >= task.target_value,
      })))
    }
  }

  const getTaskCompletion = (taskId: string) => {
    return taskCompletions.get(taskId) || { value: 0, is_completed: false }
  }

  const calculateProgress = () => {
    if (!challenge?.tasks) return 0
    const requiredTasks = challenge.tasks.filter(t => t.is_required)
    if (requiredTasks.length === 0) return 100
    const completedRequired = requiredTasks.filter(t => getTaskCompletion(t.id).is_completed).length
    return Math.round((completedRequired / requiredTasks.length) * 100)
  }

  const handleSave = async () => {
    try {
      const completions = Array.from(taskCompletions.entries()).map(([task_id, data]) => ({
        task_id,
        value: data.value,
        is_completed: data.is_completed,
      }))

      await saveDailyEntry.mutateAsync({
        challenge_id: params.id,
        date: params.date,
        note: note || undefined,
        image_url: imageUrl || undefined,
        task_completions: completions,
      })

      toast({
        title: 'Check-in saved!',
        description: calculateProgress() === 100 ? 'Great job! Day complete!' : 'Progress saved.',
        variant: 'success',
      })

      router.push('/dashboard')
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Failed to save check-in',
        variant: 'destructive',
      })
    }
  }

  if (challengeLoading || entryLoading) {
    return <CheckInSkeleton />
  }

  if (!challenge) {
    return <div>Challenge not found</div>
  }

  const dayNumber = getDayNumber(challenge.start_date, params.date)
  const progress = calculateProgress()
  const tasks = challenge.tasks?.sort((a, b) => a.position - b.position) || []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Day {dayNumber} Check-in</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formatDate(params.date)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Today&apos;s Progress</span>
            <span className="text-2xl font-bold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          {progress === 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 mt-4 text-primary"
            >
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">All tasks completed!</span>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Synced Activities */}
      {fitnessActivities && fitnessActivities.length > 0 && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Synced Activities
            </CardTitle>
            <CardDescription>
              Activities from Strava that may have auto-filled your tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fitnessActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border"
                >
                  <div className="flex-1">
                    <div className="font-medium">{activity.name || 'Untitled Activity'}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                      <span className="capitalize">{activity.activity_type}</span>
                      {activity.distance_meters && (
                        <span>{(activity.distance_meters / 1000).toFixed(2)} km</span>
                      )}
                      {activity.duration_seconds && (
                        <span>{Math.round(activity.duration_seconds / 60)} min</span>
                      )}
                      {activity.calories_burned && (
                        <span>{activity.calories_burned} cal</span>
                      )}
                    </div>
                  </div>
                  {activity.raw_data && (activity.raw_data as any).id && (
                    <a
                      href={`https://www.strava.com/activities/${(activity.raw_data as any).id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Daily Tasks</CardTitle>
          <CardDescription>
            Complete your tasks for the day
            {fitnessActivities && fitnessActivities.length > 0 && (
              <span className="block mt-1 text-xs text-primary">
                Some tasks may have been auto-filled from your Strava activities
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence>
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TaskItem
                  task={task}
                  completion={getTaskCompletion(task.id)}
                  onChange={(value) => handleTaskChange(task.id, task, value)}
                  hasFitnessData={fitnessActivities && fitnessActivities.length > 0 && task.type === 'number'}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>
            Add any thoughts or reflections for the day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How did today go? Any wins or challenges?"
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Progress Photo */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Progress Photo</CardTitle>
          <CardDescription>
            Upload a photo to document your journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          {imageUrl ? (
            <div className="relative rounded-xl overflow-hidden">
              <Image
                src={imageUrl}
                alt="Progress"
                width={400}
                height={300}
                className="w-full h-64 object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setImageUrl(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
            >
              <input {...getInputProps()} />
              {uploadingImage ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop an image or click to upload
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-4 sticky bottom-4">
        <Link href="/dashboard" className="flex-1">
          <Button variant="outline" className="w-full">
            Cancel
          </Button>
        </Link>
        <Button
          onClick={handleSave}
          disabled={saveDailyEntry.isPending}
          className="flex-1 gap-2 glow"
        >
          {saveDailyEntry.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Save Check-in
        </Button>
      </div>
    </div>
  )
}

function TaskItem({
  task,
  completion,
  onChange,
  hasFitnessData = false,
}: {
  task: Task
  completion: { value: number; is_completed: boolean }
  onChange: (value: number | boolean) => void
  hasFitnessData?: boolean
}) {
  return (
    <div 
      className={`p-4 rounded-xl border transition-colors ${
        completion.is_completed 
          ? 'bg-primary/10 border-primary/30' 
          : 'bg-secondary/50 border-border'
      }`}
    >
      <div className="flex items-center gap-4">
        {task.type === 'checkbox' ? (
          <Checkbox
            checked={completion.is_completed}
            onCheckedChange={(checked) => onChange(!!checked)}
            className="w-6 h-6"
          />
        ) : (
          <div 
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              completion.is_completed 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'border-muted-foreground'
            }`}
          >
            {completion.is_completed && <CheckCircle2 className="w-4 h-4" />}
          </div>
        )}

        <div className="flex-1">
          <Label className="text-base font-medium flex items-center gap-2">
            {task.label}
            {!task.is_required && (
              <span className="text-xs text-muted-foreground">(optional)</span>
            )}
            {hasFitnessData && completion.value > 0 && (
              <Badge variant="outline" className="text-xs">
                <Activity className="w-3 h-3 mr-1" />
                Auto-filled
              </Badge>
            )}
          </Label>
        </div>

        {task.type === 'number' && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={completion.value || ''}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              className="w-20 text-center"
              min={0}
              step={task.target_value >= 1 ? 1 : 0.1}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              / {task.target_value} {task.unit}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckInSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Card className="glass-card">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

