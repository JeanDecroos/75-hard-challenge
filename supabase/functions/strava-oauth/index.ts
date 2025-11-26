import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { StravaClient } from '../../../src/lib/strava.ts'

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

    const stravaClient = new StravaClient(
      Deno.env.get('STRAVA_CLIENT_ID') ?? '',
      Deno.env.get('STRAVA_CLIENT_SECRET') ?? ''
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'authorize') {
      // Return the authorization URL for the frontend to redirect to
      const redirectUri = `${Deno.env.get('APP_URL')}/api/auth/strava/callback`
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

      const redirectUri = `${Deno.env.get('APP_URL')}/api/auth/strava/callback`

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
          'Location': `${Deno.env.get('APP_URL')}/settings?strava=connected`,
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
