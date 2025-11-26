import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface Profile {
  id: string
  display_name: string | null
  timezone: string | null
  reminder_enabled: boolean
  reminder_time: string
}

interface UserWithEmail {
  email: string
  profile: Profile
}

serve(async (req) => {
  try {
    // Only allow POST requests (for cron jobs)
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Verify cron secret if provided
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!RESEND_API_KEY) {
      return new Response('RESEND_API_KEY not configured', { status: 500 })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response('Supabase credentials not configured', { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get current UTC time
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentMinute = now.getUTCMinutes()

    // Get all profiles with reminders enabled
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('reminder_enabled', true)

    if (profilesError) {
      throw profilesError
    }

    const usersToRemind: UserWithEmail[] = []

    // Check each user's local time against their reminder time
    for (const profile of profiles) {
      if (!profile.reminder_time || !profile.timezone) continue

      const [reminderHour, reminderMinute] = profile.reminder_time.split(':').map(Number)
      
      // Calculate the user's local time
      const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: profile.timezone }))
      const userHour = userLocalTime.getHours()
      const userMinute = userLocalTime.getMinutes()

      // Check if it's time to send reminder (within 5 minute window)
      if (userHour === reminderHour && Math.abs(userMinute - reminderMinute) <= 5) {
        // Get user email from auth
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id)
        
        if (authError || !authUser?.user?.email) continue

        usersToRemind.push({
          email: authUser.user.email,
          profile,
        })
      }
    }

    // For each user, check if they've already checked in today
    const today = new Date().toISOString().split('T')[0]
    const remindersToSend: UserWithEmail[] = []

    for (const user of usersToRemind) {
      // Get user's active challenges
      const { data: challenges, error: challengesError } = await supabase
        .from('challenges')
        .select('id, name')
        .eq('user_id', user.profile.id)

      if (challengesError || !challenges?.length) continue

      // Check if user has checked in for all challenges today
      let hasUnfinishedChallenge = false

      for (const challenge of challenges) {
        const { data: entry, error: entryError } = await supabase
          .from('daily_entries')
          .select('is_complete')
          .eq('challenge_id', challenge.id)
          .eq('user_id', user.profile.id)
          .eq('date', today)
          .single()

        if (entryError || !entry || !entry.is_complete) {
          hasUnfinishedChallenge = true
          break
        }
      }

      if (hasUnfinishedChallenge) {
        remindersToSend.push(user)
      }
    }

    // Send reminders via Resend
    const results = await Promise.allSettled(
      remindersToSend.map(async (user) => {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: '75 Hard Challenge <noreply@yourdomain.com>',
            to: user.email,
            subject: "Don't forget your daily check-in! 🔥",
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: system-ui, -apple-system, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px; }
                    .container { max-width: 500px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .logo { width: 60px; height: 60px; background: rgba(34, 197, 94, 0.2); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
                    .logo svg { width: 32px; height: 32px; color: #22c55e; }
                    h1 { font-size: 24px; margin: 0; }
                    .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
                    .message { font-size: 16px; line-height: 1.6; color: #a3a3a3; }
                    .button { display: inline-block; background: #22c55e; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px; }
                    .footer { text-align: center; font-size: 12px; color: #737373; margin-top: 40px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <div class="logo">🔥</div>
                      <h1>Daily Reminder</h1>
                    </div>
                    <div class="card">
                      <p class="message">
                        Hey ${user.profile.display_name || 'there'}! 👋
                        <br><br>
                        You haven't completed your daily check-in yet. Don't break your streak!
                        <br><br>
                        Every day counts towards building unbreakable habits. Take a few minutes to log your progress now.
                      </p>
                      <a href="${Deno.env.get('APP_URL') || 'http://localhost:3000'}/dashboard" class="button">
                        Complete Check-in →
                      </a>
                    </div>
                    <div class="footer">
                      <p>You received this email because you enabled daily reminders.</p>
                      <p>Manage your notification settings in the app.</p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Failed to send email: ${error}`)
        }

        return { email: user.email, success: true }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return new Response(
      JSON.stringify({
        message: 'Reminders processed',
        checked: usersToRemind.length,
        needReminder: remindersToSend.length,
        sent: successful,
        failed,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing reminders:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

