'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useStravaStatus, useStravaAuthorize, useStravaDisconnect, useStravaSync } from '@/hooks/use-fitness'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { timezones } from '@/lib/utils'
import { 
  ArrowLeft,
  User,
  Bell,
  Clock,
  Globe,
  Save,
  Loader2,
  Activity,
  RefreshCw,
  Unlink,
  ExternalLink
} from 'lucide-react'

export default function SettingsPage() {
  const { toast } = useToast()
  const { user, profile, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [reminderTime, setReminderTime] = useState('20:00')
  const [initialized, setInitialized] = useState(false)

  // Initialize state from profile
  useEffect(() => {
    if (profile && !initialized) {
      setDisplayName(profile.display_name || '')
      setTimezone(profile.timezone || 'America/New_York')
      setReminderEnabled(profile.reminder_enabled)
      setReminderTime(profile.reminder_time || '20:00')
      setInitialized(true)
    }
  }, [profile, initialized])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          timezone,
          reminder_enabled: reminderEnabled,
          reminder_time: reminderTime,
        })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: 'Settings saved!',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return <SettingsSkeleton />
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
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
      </div>

      {/* Profile Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timezone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Timezone
            </CardTitle>
            <CardDescription>
              Set your timezone for accurate reminder scheduling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones().map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reminder Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Daily Reminders
            </CardTitle>
            <CardDescription>
              Get reminded to complete your daily check-in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Receive an email if you haven&apos;t checked in for the day
                </p>
              </div>
              <Switch
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
              />
            </div>

            {reminderEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <Label htmlFor="reminder-time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Reminder Time
                </Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Based on your selected timezone ({timezone})
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Fitness Integrations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <FitnessIntegrationsCard />
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full gap-2"
          size="lg"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </Button>
      </motion.div>
    </div>
  )
}

function FitnessIntegrationsCard() {
  const { data: stravaStatus, isLoading } = useStravaStatus()
  const authorizeMutation = useStravaAuthorize()
  const disconnectMutation = useStravaDisconnect()
  const syncMutation = useStravaSync()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const handleStravaConnect = async () => {
    try {
      const authUrl = await authorizeMutation.mutateAsync()
      // Open Strava OAuth in a new tab
      const width = 600
      const height = 700
      const left = (window.screen.width - width) / 2
      const top = (window.screen.height - height) / 2
      
      const popup = window.open(
        authUrl,
        'strava-oauth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      )

      if (!popup) {
        toast({
          title: 'Popup blocked',
          description: 'Please allow popups for this site to connect Strava',
          variant: 'destructive',
        })
        return
      }

      // Track interval for cleanup
      let checkClosed: NodeJS.Timeout | null = null

      // Listen for messages from the OAuth callback
      const messageListener = (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'strava-oauth-success') {
          // Close popup and clean up
          if (checkClosed) clearInterval(checkClosed)
          window.removeEventListener('message', messageListener)
          
          // Close the popup
          if (popup && !popup.closed) {
            popup.close()
          }
          
          // Reset mutation state
          authorizeMutation.reset()
          
          // Wait a moment for backend to process, then refetch status
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['strava-status'] })
            queryClient.refetchQueries({ queryKey: ['strava-status'] })
          }, 500)
          
          toast({
            title: 'Strava connected!',
            variant: 'success',
          })
        } else if (event.data.type === 'strava-oauth-error') {
          // Close popup and clean up
          if (checkClosed) clearInterval(checkClosed)
          window.removeEventListener('message', messageListener)
          
          // Close the popup
          if (popup && !popup.closed) {
            popup.close()
          }
          
          toast({
            title: 'Failed to connect Strava',
            description: event.data.error || 'An error occurred',
            variant: 'destructive',
          })
        }
      }

      window.addEventListener('message', messageListener)

      // Check if popup was closed manually
      checkClosed = setInterval(() => {
        if (popup.closed) {
          if (checkClosed) clearInterval(checkClosed)
          window.removeEventListener('message', messageListener)
        }
      }, 1000)
    } catch (error) {
      toast({
        title: 'Failed to connect to Strava',
        variant: 'destructive',
      })
    }
  }

  const handleStravaDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync()
      toast({
        title: 'Strava disconnected',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Failed to disconnect Strava',
        variant: 'destructive',
      })
    }
  }

  const handleStravaSync = async () => {
    try {
      const result = await syncMutation.mutateAsync()
      toast({
        title: `Synced ${result.activities_synced} activities`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Failed to sync activities',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Fitness Integrations
        </CardTitle>
        <CardDescription>
          Connect fitness apps to automatically track your activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strava Integration */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <h3 className="font-medium">Strava</h3>
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  'Loading...'
                ) : stravaStatus?.connected ? (
                  `Connected • Last sync: ${stravaStatus.last_sync ? new Date(stravaStatus.last_sync).toLocaleDateString() : 'Never'}`
                ) : (
                  'Sync running, cycling, and fitness activities'
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {stravaStatus?.connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStravaSync}
                  disabled={syncMutation.isPending}
                  className="gap-2"
                >
                  {syncMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Sync
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStravaDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="gap-2"
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4" />
                  )}
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={handleStravaConnect}
                disabled={authorizeMutation.isPending}
                className="gap-2"
              >
                {authorizeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Apple Health Placeholder */}
        <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <div>
              <h3 className="font-medium">Apple Health</h3>
              <p className="text-sm text-muted-foreground">
                iOS only • Coming soon
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>
            Coming Soon
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <Card key={i} className="glass-card">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

