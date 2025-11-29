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

  getAuthorizationUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'read,activity:read',
    })

    if (state) {
      params.set('state', state)
    }

    return `https://www.strava.com/oauth/authorize?${params.toString()}`
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<StravaTokens> {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!response.ok) {
      throw new Error(`Strava token exchange failed: ${response.statusText}`)
    }

    return response.json()
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stravaClientId = Deno.env.get('STRAVA_CLIENT_ID')
    const stravaClientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')
    const appUrl = Deno.env.get('APP_URL')

    if (!stravaClientId || !stravaClientSecret) {
      console.error('Missing Strava credentials: STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET not set')
      return new Response(
        JSON.stringify({ error: 'Strava integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!appUrl) {
      console.error('Missing APP_URL environment variable')
      return new Response(
        JSON.stringify({ error: 'APP_URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stravaClient = new StravaClient(stravaClientId, stravaClientSecret)

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'authorize') {
      // Return the authorization URL for the frontend to redirect to
      const redirectUri = `${appUrl}/api/auth/strava/callback`
      const authUrl = stravaClient.getAuthorizationUrl(redirectUri, user.id)

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'callback') {
      // Handle the OAuth callback
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state') // This should be the user ID

      if (!code || !state) {
        return new Response(
          JSON.stringify({ error: 'Missing code or state parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const redirectUri = `${appUrl}/api/auth/strava/callback`

      // Exchange code for tokens
      const tokens = await stravaClient.exchangeCodeForTokens(code, redirectUri)

      // Store the tokens in the database
      const { error } = await supabaseClient
        .from('fitness_providers')
        .upsert({
          user_id: state,
          provider: 'strava',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
          athlete_id: tokens.athlete.id.toString(),
          is_active: true,
        })

      if (error) {
        console.error('Error storing Strava tokens:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to store tokens' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Redirect back to the app
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${appUrl}/settings?strava=connected`,
        },
      })
    }

    if (action === 'sync') {
      // Sync fitness activities
      const { data: provider, error: providerError } = await supabaseClient
        .from('fitness_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'strava')
        .eq('is_active', true)
        .single()

      if (providerError || !provider) {
        return new Response(
          JSON.stringify({ error: 'Strava not connected' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let accessToken = provider.access_token

      // Check if token is expired and refresh if needed
      if (new Date(provider.token_expires_at) <= new Date()) {
        const tokens = await stravaClient.refreshToken(provider.refresh_token!)
        accessToken = tokens.access_token

        // Update tokens in database
        await supabaseClient
          .from('fitness_providers')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
          })
          .eq('id', provider.id)
      }

      // Get activities from the last 30 days
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)
      const activities = await stravaClient.getActivities(accessToken, {
        after: thirtyDaysAgo,
        per_page: 200, // Strava allows up to 200 per page
      })

      // Store activities in database
      const fitnessActivities = activities.map(activity => ({
        user_id: user.id,
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

      const { error: activitiesError } = await supabaseClient
        .from('fitness_activities')
        .upsert(fitnessActivities, {
          onConflict: 'user_id,provider,provider_activity_id'
        })

      if (activitiesError) {
        console.error('Error storing activities:', activitiesError)
        return new Response(
          JSON.stringify({ error: 'Failed to store activities' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update last sync time
      await supabaseClient
        .from('fitness_providers')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', provider.id)

      return new Response(
        JSON.stringify({
          success: true,
          activities_synced: activities.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in strava-oauth function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
