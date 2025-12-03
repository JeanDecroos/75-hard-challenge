import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// StravaClient class (inlined for edge function)
interface StravaTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: {
    id: number
  }
}

interface StravaActivity {
  id: number
  name: string
  type: string
  start_date: string
  elapsed_time: number
  distance: number
  total_elevation_gain?: number
  average_speed?: number
  max_speed?: number
  has_heartrate: boolean
  average_heartrate?: number
  max_heartrate?: number
  calories?: number
}

class StravaClient {
  private clientId: string
  private clientSecret: string

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  async refreshToken(refreshToken: string): Promise<StravaTokens> {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error(`Strava token refresh failed: ${response.statusText}`)
    }

    return response.json()
  }

  async getActivities(accessToken: string, options: {
    before?: number
    after?: number
    page?: number
    per_page?: number
  } = {}): Promise<StravaActivity[]> {
    const params = new URLSearchParams()
    if (options.before) params.set('before', options.before.toString())
    if (options.after) params.set('after', options.after.toString())
    if (options.page) params.set('page', options.page.toString())
    if (options.per_page) params.set('per_page', options.per_page.toString())

    const url = `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Strava activities: ${response.statusText}`)
    }

    return response.json()
  }
}

interface SyncResult {
  user_id: string
  success: boolean
  activities_synced: number
  error?: string
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

    const stravaClientId = Deno.env.get('STRAVA_CLIENT_ID')
    const stravaClientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stravaClientId || !stravaClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Strava credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role key (to access all users)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const stravaClient = new StravaClient(stravaClientId, stravaClientSecret)

    // Get all active Strava connections
    const { data: providers, error: providersError } = await supabase
      .from('fitness_providers')
      .select('*')
      .eq('provider', 'strava')
      .eq('is_active', true)

    if (providersError) {
      throw providersError
    }

    if (!providers || providers.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No active Strava connections found',
          synced: 0,
          results: [],
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Sync activities for each user
    const syncResults: SyncResult[] = []
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)

    // Process syncs sequentially to avoid rate limiting
    for (const provider of providers) {
      try {
        let accessToken = provider.access_token

        // Check if token is expired and refresh if needed
        if (provider.token_expires_at && new Date(provider.token_expires_at) <= new Date()) {
          if (!provider.refresh_token) {
            syncResults.push({
              user_id: provider.user_id,
              success: false,
              activities_synced: 0,
              error: 'Refresh token missing',
            })
            continue
          }

          try {
            const tokens = await stravaClient.refreshToken(provider.refresh_token)
            accessToken = tokens.access_token

            // Update tokens in database
            await supabase
              .from('fitness_providers')
              .update({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
              })
              .eq('id', provider.id)
          } catch (refreshError) {
            console.error(`Failed to refresh token for user ${provider.user_id}:`, refreshError)
            syncResults.push({
              user_id: provider.user_id,
              success: false,
              activities_synced: 0,
              error: `Token refresh failed: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`,
            })
            continue
          }
        }

        // Fetch activities from Strava
        const activities = await stravaClient.getActivities(accessToken, {
          after: thirtyDaysAgo,
          per_page: 200, // Strava allows up to 200 per page
        })

        // Transform activities to our format
        const fitnessActivities = activities.map(activity => ({
          user_id: provider.user_id,
          provider: 'strava' as const,
          provider_activity_id: activity.id.toString(),
          activity_type: activity.type.toLowerCase(),
          name: activity.name,
          start_date: activity.start_date,
          duration_seconds: activity.elapsed_time,
          distance_meters: activity.distance,
          calories_burned: activity.calories,
          heart_rate_avg: activity.average_heartrate,
          heart_rate_max: activity.max_heartrate,
          raw_data: activity,
        }))

        // Upsert activities into database
        const { error: activitiesError } = await supabase
          .from('fitness_activities')
          .upsert(fitnessActivities, {
            onConflict: 'user_id,provider,provider_activity_id',
          })

        if (activitiesError) {
          throw activitiesError
        }

        // Update last sync time
        await supabase
          .from('fitness_providers')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', provider.id)

        syncResults.push({
          user_id: provider.user_id,
          success: true,
          activities_synced: activities.length,
        })

        // Small delay between users to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Error syncing Strava for user ${provider.user_id}:`, error)
        syncResults.push({
          user_id: provider.user_id,
          success: false,
          activities_synced: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successful = syncResults.filter(r => r.success).length
    const failed = syncResults.filter(r => !r.success).length
    const totalActivities = syncResults.reduce((sum, r) => sum + r.activities_synced, 0)

    return new Response(
      JSON.stringify({
        message: 'Strava auto-sync completed',
        total_users: providers.length,
        successful,
        failed,
        total_activities_synced: totalActivities,
        results: syncResults,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in strava-auto-sync function:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
