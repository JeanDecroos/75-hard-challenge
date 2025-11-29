'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useCreateChallenge } from '@/hooks/use-challenges'
import { DEFAULT_TASKS, type DefaultTask } from '@/types'
import { 
  Flame, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical,
  Calendar,
  Target,
  Loader2,
  Sparkles
} from 'lucide-react'
import { getLocalDateString } from '@/lib/utils'

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const createChallenge = useCreateChallenge()
  
  const [step, setStep] = useState(1)
  const [useTemplate, setUseTemplate] = useState<boolean | null>(null)
  const [challengeName, setChallengeName] = useState('My 75 Hard Challenge')
  const [startDate, setStartDate] = useState(getLocalDateString())
  const [durationDays, setDurationDays] = useState(75)
  const [tasks, setTasks] = useState<DefaultTask[]>([...DEFAULT_TASKS])

  const handleAddTask = () => {
    const newTask: DefaultTask = {
      label: 'New Task',
      type: 'checkbox',
      target_value: 1,
      unit: null,
      is_required: true,
      position: tasks.length,
    }
    setTasks([...tasks, newTask])
  }

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  const handleUpdateTask = (index: number, updates: Partial<DefaultTask>) => {
    setTasks(tasks.map((task, i) => 
      i === index ? { ...task, ...updates } : task
    ))
  }

  const handleSubmit = async () => {
    try {
      const challenge = await createChallenge.mutateAsync({
        name: challengeName,
        start_date: startDate,
        duration_days: durationDays,
        tasks: tasks.map((task, index) => ({ ...task, position: index })),
      })

      toast({
        title: 'Challenge created!',
        description: 'Your 75 Hard challenge is ready to go.',
        variant: 'success',
      })

      router.push(`/dashboard`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create challenge'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    }
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Flame className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Create Your Challenge</h1>
          <p className="text-muted-foreground">
            Step {step} of 3
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Choose Template or Custom */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>How would you like to start?</CardTitle>
                  <CardDescription>
                    Choose a template or create your own custom challenge
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <button
                    onClick={() => {
                      setUseTemplate(true)
                      setTasks([...DEFAULT_TASKS])
                      setStep(2)
                    }}
                    className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                      useTemplate === true 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Target className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Use Default Template</h3>
                        <p className="text-muted-foreground text-sm">
                          Start with the classic 75 Hard tasks: reading, walking, 
                          healthy eating, and hydration.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setUseTemplate(false)
                      setTasks([])
                      setStep(2)
                    }}
                    className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                      useTemplate === false 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Sparkles className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Create Custom Challenge</h3>
                        <p className="text-muted-foreground text-sm">
                          Design your own challenge with custom tasks, 
                          targets, and duration.
                        </p>
                      </div>
                    </div>
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Configure Tasks */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Configure Your Tasks</CardTitle>
                  <CardDescription>
                    Customize the daily tasks you want to track
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {tasks.map((task, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 rounded-xl bg-secondary/50 border"
                      >
                        <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-grab" />
                        
                        <div className="flex-1 space-y-3">
                          <Input
                            value={task.label}
                            onChange={(e) => handleUpdateTask(index, { label: e.target.value })}
                            placeholder="Task name"
                          />
                          
                          <div className="flex flex-wrap gap-3">
                            <Select
                              value={task.type}
                              onValueChange={(value: 'checkbox' | 'number') => 
                                handleUpdateTask(index, { type: value })
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
                                  onChange={(e) => handleUpdateTask(index, { 
                                    target_value: parseFloat(e.target.value) || 0 
                                  })}
                                  className="w-24"
                                  placeholder="Target"
                                />
                                <Input
                                  value={task.unit || ''}
                                  onChange={(e) => handleUpdateTask(index, { 
                                    unit: e.target.value || null 
                                  })}
                                  className="w-24"
                                  placeholder="Unit"
                                />
                              </>
                            )}

                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`required-${index}`}
                                checked={task.is_required}
                                onCheckedChange={(checked) => 
                                  handleUpdateTask(index, { is_required: !!checked })
                                }
                              />
                              <Label htmlFor={`required-${index}`} className="text-sm">
                                Required
                              </Label>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTask(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      onClick={handleAddTask}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={tasks.length === 0}
                      className="flex-1"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Challenge Details */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Challenge Details</CardTitle>
                  <CardDescription>
                    Set your challenge name, start date, and duration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Challenge Name</Label>
                    <Input
                      id="name"
                      value={challengeName}
                      onChange={(e) => setChallengeName(e.target.value)}
                      placeholder="My 75 Hard Challenge"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="pl-10"
                      />
                    </div>
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

                  {/* Summary */}
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <h4 className="font-semibold mb-2">Challenge Summary</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• {tasks.length} daily tasks to complete</li>
                      <li>• {durationDays} days total duration</li>
                      <li>• Starting {new Date(startDate).toLocaleDateString()}</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={createChallenge.isPending || !challengeName}
                      className="flex-1"
                    >
                      {createChallenge.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Create Challenge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

