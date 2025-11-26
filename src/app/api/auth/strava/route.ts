import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'authorize') {
      // Get authorization URL from edge function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/strava-oauth?action=authorize`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to get authorization URL')
      }

      const data = await response.json()
      return NextResponse.json(data)
    }

    if (action === 'status') {
      // Get connection status
      const { data: provider, error } = await supabase
        .from('fitness_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'strava')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error
      }

      return NextResponse.json({
        connected: !!provider?.is_active,
        last_sync: provider?.last_sync_at,
        athlete_id: provider?.athlete_id,
      })
    }

    if (action === 'disconnect') {
      // Disconnect Strava
      const { error } = await supabase
        .from('fitness_providers')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('provider', 'strava')

      if (error) {
        throw error
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'sync') {
      // Trigger manual sync
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/strava-oauth?action=sync`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to sync activities')
      }

      const data = await response.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Strava API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
