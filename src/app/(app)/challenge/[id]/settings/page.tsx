'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useChallenge, useUpdateChallenge, useRegenerateInviteToken } from '@/hooks/use-challenges'
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/use-tasks'
import { useFitnessTaskMappings, useCreateFitnessTaskMapping, useDeleteFitnessTaskMapping } from '@/hooks/use-fitness'
import { getActivityTypeSuggestions } from '@/lib/fitness-utils'
import type { Task } from '@/types'
import {
  ArrowLeft,
  Settings,
  Plus,
  Trash2,
  GripVertical,
  RefreshCw,
  Save,
  Loader2,
  AlertTriangle,
  Activity,
  Link as LinkIcon,
  Unlink
} from 'lucide-react'

interface PageProps {
  params: {
    id: string
  }
}

export default function ChallengeSettingsPage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { data: challenge, isLoading } = useChallenge(params.id)
  const updateChallenge = useUpdateChallenge()
  const regenerateToken = useRegenerateInviteToken()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const fitnessMappings = useFitnessTaskMappings()
  const createFitnessMapping = useCreateFitnessTaskMapping()
  const deleteFitnessMapping = useDeleteFitnessTaskMapping()

  const [name, setName] = useState('')
  const [durationDays, setDurationDays] = useState(75)
  const [tasks, setTasks] = useState<Task[]>([])
  const [initialized, setInitialized] = useState(false)

  // Initialize state from challenge data
  if (challenge && !initialized) {
    setName(challenge.name)
    setDurationDays(challenge.duration_days)
    setTasks(challenge.tasks?.sort((a, b) => a.position - b.position) || [])
    setInitialized(true)
  }

  const handleSaveGeneral = async () => {
    try {
      await updateChallenge.mutateAsync({
        id: params.id,
        name,
        duration_days: durationDays,
      })
      toast({
        title: 'Settings saved!',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Failed to save',
        variant: 'destructive',
      })
    }
  }

  const handleRegenerateToken = async () => {
    try {
      await regenerateToken.mutateAsync(params.id)
      toast({
        title: 'Invite link regenerated!',
        description: 'The old link will no longer work.',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Failed to regenerate',
        variant: 'destructive',
      })
    }
  }

  const handleAddTask = async () => {
    const maxPosition = Math.max(...tasks.map(t => t.position), -1)
    try {
      const newTask = await createTask.mutateAsync({
        challenge_id: params.id,
        label: 'New Task',
        type: 'checkbox',
        target_value: 1,
        unit: null,
        is_required: true,
        position: maxPosition + 1,
      })
      setTasks([...tasks, newTask])
      toast({
        title: 'Task added!',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Failed to add task',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    )
    setTasks(updatedTasks)
  }

  const handleSaveTask = async (task: Task) => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        label: task.label,
        type: task.type,
        target_value: task.target_value,
        unit: task.unit,
        is_required: task.is_required,
        position: task.position,
      })
      toast({
        title: 'Task updated!',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Failed to update task',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync({ id: taskId, challengeId: params.id })
      setTasks(tasks.filter(t => t.id !== taskId))
      toast({
        title: 'Task deleted',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Failed to delete task',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return <SettingsSkeleton />
  }

  if (!challenge) {
    return <div>Challenge not found</div>
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Challenge Settings</h1>
          <p className="text-muted-foreground">{challenge.name}</p>
        </div>
      </div>

      {/* General Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Challenge Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (Days)</Label>
            <Input
              id="duration"
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value) || 75)}
              min={1}
              max={365}
            />
          </div>

          <Button 
            onClick={handleSaveGeneral}
            disabled={updateChallenge.isPending}
            className="w-full gap-2"
          >
            {updateChallenge.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Task Management */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>
            Manage the tasks for your challenge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <TaskEditor
                task={task}
                onUpdate={(updates) => handleUpdateTask(task.id, updates)}
                onSave={() => handleSaveTask(task)}
                onDelete={() => handleDeleteTask(task.id)}
              />
            </motion.div>
          ))}

          <Button
            variant="outline"
            onClick={handleAddTask}
            disabled={createTask.isPending}
            className="w-full gap-2"
          >
            {createTask.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add Task
          </Button>
        </CardContent>
      </Card>

      {/* Invite Link */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Invite Link</CardTitle>
          <CardDescription>
            Regenerate the invite link if it has been compromised
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-secondary/50 border">
            <p className="font-mono text-sm break-all">{challenge.invite_token}</p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <RefreshCw className="w-4 h-4" />
                Regenerate Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Regenerate Invite Link?
                </DialogTitle>
                <DialogDescription>
                  This will invalidate the current invite link. Anyone with the 
                  old link will no longer be able to join.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={handleRegenerateToken}
                  disabled={regenerateToken.isPending}
                >
                  {regenerateToken.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Regenerate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Fitness Mappings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Fitness Integration
            </CardTitle>
            <CardDescription>
              Automatically populate task progress from fitness activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Link your tasks to fitness activities to automatically complete them based on your tracked workouts.
            </div>

            <div className="space-y-3">
              {tasks.map(task => {
                const mapping = fitnessMappings.data?.find(m => m.task_id === task.id)
                return (
                  <TaskFitnessMapping
                    key={task.id}
                    task={task}
                    mapping={mapping}
                    onCreate={createFitnessMapping.mutateAsync}
                    onDelete={deleteFitnessMapping.mutateAsync}
                    isLoading={createFitnessMapping.isPending || deleteFitnessMapping.isPending}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function TaskEditor({
  task,
  onUpdate,
  onSave,
  onDelete,
}: {
  task: Task
  onUpdate: (updates: Partial<Task>) => void
  onSave: () => void
  onDelete: () => void
}) {
  const [isDirty, setIsDirty] = useState(false)

  const handleUpdate = (updates: Partial<Task>) => {
    onUpdate(updates)
    setIsDirty(true)
  }

  const handleSave = () => {
    onSave()
    setIsDirty(false)
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/50 border">
      <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-grab" />
      
      <div className="flex-1 space-y-3">
        <Input
          value={task.label}
          onChange={(e) => handleUpdate({ label: e.target.value })}
          placeholder="Task name"
        />
        
        <div className="flex flex-wrap gap-3">
          <Select
            value={task.type}
            onValueChange={(value: 'checkbox' | 'number') => 
              handleUpdate({ type: value })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="number">Number</SelectItem>
            </SelectContent>
          </Select>

          {task.type === 'number' && (
            <>
              <Input
                type="number"
                value={task.target_value}
                onChange={(e) => handleUpdate({ 
                  target_value: parseFloat(e.target.value) || 0 
                })}
                className="w-20"
                placeholder="Target"
              />
              <Input
                value={task.unit || ''}
                onChange={(e) => handleUpdate({ 
                  unit: e.target.value || null 
                })}
                className="w-20"
                placeholder="Unit"
              />
            </>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              checked={task.is_required}
              onCheckedChange={(checked) => 
                handleUpdate({ is_required: !!checked })
              }
            />
            <Label className="text-sm">Required</Label>
          </div>
        </div>

        {isDirty && (
          <Button size="sm" onClick={handleSave} className="gap-1">
            <Save className="w-3 h-3" />
            Save
          </Button>
        )}
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{task.label}&quot; and all associated 
              completion data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={onDelete}>
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TaskFitnessMapping({
  task,
  mapping,
  onCreate,
  onDelete,
  isLoading
}: {
  task: Task
  mapping: any
  onCreate: (data: { task_id: string; activity_type: string; metric: 'distance' | 'duration' | 'steps' | 'calories'; multiplier: number }) => Promise<any>
  onDelete: (id: string) => Promise<void>
  isLoading: boolean
}) {
  const [activityType, setActivityType] = useState(mapping?.activity_type || '')
  const [metric, setMetric] = useState<'distance' | 'duration' | 'steps' | 'calories'>(mapping?.metric || 'distance')
  const [multiplier, setMultiplier] = useState(mapping?.multiplier || 1)
  const { toast } = useToast()

  const suggestions = getActivityTypeSuggestions()
  const selectedSuggestion = suggestions.find(s => s.value === activityType)

  const handleCreate = async () => {
    if (!activityType || !metric) return

    try {
      await onCreate({
        task_id: task.id,
        activity_type: activityType,
        metric,
        multiplier,
      })
      toast({
        title: 'Fitness mapping created!',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Failed to create mapping',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!mapping?.id) return

    try {
      await onDelete(mapping.id)
      toast({
        title: 'Fitness mapping removed!',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Failed to remove mapping',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="font-medium">{task.label}</div>
        <div className="text-sm text-muted-foreground">
          Target: {task.target_value} {task.unit || ''}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {mapping ? (
          <div className="text-sm">
            <span className="text-muted-foreground">Linked to </span>
            <span className="font-medium">{selectedSuggestion?.label || activityType}</span>
            <span className="text-muted-foreground"> ({metric})</span>
            {multiplier !== 1 && <span className="text-muted-foreground"> ×{multiplier}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Activity" />
              </SelectTrigger>
              <SelectContent>
                {suggestions.map(suggestion => (
                  <SelectItem key={suggestion.value} value={suggestion.value}>
                    {suggestion.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectedSuggestion?.metrics.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {metric === 'distance' && (
              <Input
                type="number"
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1)}
                className="w-16"
                step="0.1"
                placeholder="1.0"
              />
            )}
          </div>
        )}

        <div className="flex gap-1">
          {mapping ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Unlink className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreate}
              disabled={isLoading || !activityType || !metric}
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Card className="glass-card">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-24" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

