import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    // Redirect to settings with error
    return NextResponse.redirect(
      new URL(`/settings?strava=error&error=${error}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/settings?strava=error&error=missing_params', request.url)
    )
  }

  try {
    // Call the Edge Function to handle the OAuth callback
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== state) {
      return NextResponse.redirect(
        new URL('/settings?strava=error&error=auth_mismatch', request.url)
      )
    }

    // The edge function will handle the actual token exchange
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/strava-oauth?action=callback&code=${code}&state=${state}`,
      {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to complete Strava OAuth')
    }

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL('/settings?strava=connected', request.url)
    )

  } catch (error) {
    console.error('Strava OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?strava=error&error=callback_failed', request.url)
    )
  }
}
