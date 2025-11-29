# Strava Integration Setup Guide

## Prerequisites

1. A Strava account
2. A Strava application registered at https://www.strava.com/settings/api

## Step 1: Create a Strava Application

1. Go to https://www.strava.com/settings/api
2. Click "Create App" or "Create Application"
3. Fill in the application details:
   - **Application Name**: Your app name (e.g., "75 Hard Challenge")
   - **Category**: Choose appropriate category
   - **Club**: Optional
   - **Website**: Your app URL (e.g., `https://your-app.netlify.app`)
   - **Application Description**: Brief description
   - **Authorization Callback Domain**: Your domain without protocol (e.g., `your-app.netlify.app`)
4. Click "Create"
5. **Save your Client ID and Client Secret** - you'll need these in the next step

## Step 2: Configure Redirect URI in Strava

The redirect URI must match exactly what your app uses. Based on the code:

**Redirect URI**: `https://your-app.netlify.app/api/auth/strava/callback`

Make sure this is added to your Strava app's authorized redirect URIs.

## Step 3: Set Supabase Edge Function Secrets

You need to set three secrets for the `strava-oauth` Edge Function:

### Option A: Using Supabase CLI

```bash
# Set the Strava credentials
supabase secrets set STRAVA_CLIENT_ID=your_client_id_here
supabase secrets set STRAVA_CLIENT_SECRET=your_client_secret_here
supabase secrets set APP_URL=https://your-app.netlify.app
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **strava-oauth**
3. Click on **Settings** or **Secrets**
4. Add the following secrets:
   - `STRAVA_CLIENT_ID`: Your Strava Client ID
   - `STRAVA_CLIENT_SECRET`: Your Strava Client Secret
   - `APP_URL`: Your app URL (e.g., `https://your-app.netlify.app`)

## Step 4: Verify Configuration

1. The redirect URI in Strava should be: `https://your-app.netlify.app/api/auth/strava/callback`
2. The `APP_URL` secret should match your Netlify deployment URL
3. Make sure there are no trailing slashes in the URLs

## Troubleshooting

### "Invalid client_id" Error

- Verify the `STRAVA_CLIENT_ID` secret is set correctly in Supabase
- Check that the Client ID matches what's shown in your Strava app settings
- Ensure there are no extra spaces or characters

### "Redirect URI mismatch" Error

- Verify the redirect URI in Strava matches exactly: `https://your-app.netlify.app/api/auth/strava/callback`
- Check that `APP_URL` secret is set correctly (no trailing slash)
- Make sure the domain in Strava's "Authorization Callback Domain" matches your app domain

### "Strava integration not configured" Error

- Check that all three secrets are set: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and `APP_URL`
- Verify the Edge Function is deployed and active
- Check Supabase Edge Function logs for more details

## Testing

1. Navigate to Settings → Fitness Integrations
2. Click "Connect" for Strava
3. You should be redirected to Strava's authorization page
4. After authorizing, you should be redirected back to your app

