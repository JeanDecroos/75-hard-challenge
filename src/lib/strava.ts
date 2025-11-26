import strava from 'strava-v3'

export interface StravaTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: {
    id: number
  }
}

export interface StravaActivity {
  id: number
  name: string
  type: string
  start_date: string
  elapsed_time: number // seconds
  distance: number // meters
  total_elevation_gain?: number
  average_speed?: number
  max_speed?: number
  has_heartrate: boolean
  average_heartrate?: number
  max_heartrate?: number
  calories?: number
}

export class StravaClient {
  private clientId: string
  private clientSecret: string

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  // Get OAuth authorization URL
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

  // Exchange authorization code for tokens
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

    const data = await response.json()
    return data
  }

  // Refresh access token
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

    const data = await response.json()
    return data
  }

  // Get athlete activities
  async getActivities(accessToken: string, options: {
    before?: number // timestamp
    after?: number // timestamp
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

  // Get single activity details
  async getActivity(accessToken: string, activityId: number): Promise<StravaActivity> {
    const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Strava activity: ${response.statusText}`)
    }

    return response.json()
  }
}

// Utility functions for converting Strava data to our format
export function convertStravaActivityToFitnessActivity(
  stravaActivity: StravaActivity,
  userId: string
) {
  return {
    user_id: userId,
    provider: 'strava' as const,
    provider_activity_id: stravaActivity.id.toString(),
    activity_type: stravaActivity.type.toLowerCase(),
    name: stravaActivity.name,
    start_date: stravaActivity.start_date,
    duration_seconds: stravaActivity.elapsed_time,
    distance_meters: stravaActivity.distance,
    calories_burned: stravaActivity.calories,
    heart_rate_avg: stravaActivity.average_heartrate,
    heart_rate_max: stravaActivity.max_heartrate,
    raw_data: stravaActivity,
  }
}

// Map Strava activity types to our fitness metrics
export const STRAVA_ACTIVITY_MAPPINGS = {
  'walk': { type: 'walk', metrics: ['distance', 'duration'] },
  'run': { type: 'run', metrics: ['distance', 'duration'] },
  'ride': { type: 'ride', metrics: ['distance', 'duration'] },
  'swim': { type: 'swim', metrics: ['distance', 'duration'] },
  'hike': { type: 'hike', metrics: ['distance', 'duration'] },
  'workout': { type: 'workout', metrics: ['duration'] },
} as const
