import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    // Escape error parameter to prevent XSS
    const escapedError = JSON.stringify(error)
    const urlEncodedError = encodeURIComponent(error)
    
    // If opened in a popup, send error message to parent window
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Strava Connection Error</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'strava-oauth-error',
                error: ${escapedError}
              }, window.location.origin);
              window.close();
            } else {
              window.location.href = '/settings?strava=error&error=${urlEncodedError}';
            }
          </script>
        </body>
      </html>
    `
    return new NextResponse(errorHtml, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  if (!code || !state) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Strava Connection Error</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'strava-oauth-error',
                error: 'missing_params'
              }, window.location.origin);
              window.close();
            } else {
              window.location.href = '/settings?strava=error&error=missing_params';
            }
          </script>
        </body>
      </html>
    `
    return new NextResponse(errorHtml, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    // Call the Edge Function to handle the OAuth callback
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== state) {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Strava Connection Error</title>
          </head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'strava-oauth-error',
                  error: 'auth_mismatch'
                }, window.location.origin);
                window.close();
              } else {
                window.location.href = '/settings?strava=error&error=auth_mismatch';
              }
            </script>
          </body>
        </html>
      `
      return new NextResponse(errorHtml, {
        headers: { 'Content-Type': 'text/html' },
      })
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

    // If opened in a popup, send message to parent window and close
    // Otherwise, redirect normally
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Strava Connected</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              // Send success message to parent window
              window.opener.postMessage({
                type: 'strava-oauth-success'
              }, window.location.origin);
              window.close();
            } else {
              // Not in a popup, redirect normally
              window.location.href = '/settings?strava=connected';
            }
          </script>
        </body>
      </html>
    `
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    })

  } catch (error) {
    console.error('Strava OAuth callback error:', error)
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Strava Connection Error</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'strava-oauth-error',
                error: 'callback_failed'
              }, window.location.origin);
              window.close();
            } else {
              window.location.href = '/settings?strava=error&error=callback_failed';
            }
          </script>
        </body>
      </html>
    `
    return new NextResponse(errorHtml, {
      headers: { 'Content-Type': 'text/html' },
    })
  }
}
