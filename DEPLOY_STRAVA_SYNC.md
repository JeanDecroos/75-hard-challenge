# Deploy Strava Auto-Sync Function

This guide will help you deploy the `strava-auto-sync` Edge Function and set up the hourly cron job.

## Prerequisites

1. **Supabase CLI** installed (✅ Already installed)
2. **Supabase account** with a project
3. **Project reference ID** (found in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`)

## Step 1: Login to Supabase CLI

```bash
supabase login
```

This will open your browser to authenticate. After logging in, you'll be able to deploy functions.

## Step 2: Link Your Project

```bash
cd "/Users/bart-jandecroos/Library/Mobile Documents/com~apple~CloudDocs/75HardChallenge"
supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your actual project reference ID.

## Step 3: Deploy the Function

```bash
supabase functions deploy strava-auto-sync
```

## Step 4: Set Function Secrets

You need to set the following secrets for the `strava-auto-sync` function:

```bash
# Set Strava credentials (same as strava-oauth function)
supabase secrets set STRAVA_CLIENT_ID=your_client_id_here --project-ref YOUR_PROJECT_REF
supabase secrets set STRAVA_CLIENT_SECRET=your_client_secret_here --project-ref YOUR_PROJECT_REF

# Set a CRON_SECRET for securing the endpoint (generate a random string)
supabase secrets set CRON_SECRET=$(openssl rand -hex 32) --project-ref YOUR_PROJECT_REF
```

**Or via Supabase Dashboard:**
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **strava-auto-sync**
3. Click **Settings** → **Secrets**
4. Add:
   - `STRAVA_CLIENT_ID`: Your Strava Client ID
   - `STRAVA_CLIENT_SECRET`: Your Strava Client Secret
   - `CRON_SECRET`: A random secret string (for securing the cron endpoint)

## Step 5: Set Up Cron Job

You have two options:

### Option A: Using pg_cron (Supabase Pro/Team plans)

1. Enable `pg_cron` extension in your Supabase dashboard:
   - Go to **Database** → **Extensions**
   - Search for `pg_cron` and enable it

2. Run the SQL in Supabase SQL Editor:

```sql
-- Replace YOUR_PROJECT_REF and YOUR_CRON_SECRET with actual values
SELECT cron.schedule(
  'strava-auto-sync-hourly',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/strava-auto-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_CRON_SECRET'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

### Option B: Using GitHub Actions (Free tier recommended)

1. Copy the example workflow:
   ```bash
   cp .github/workflows/strava-sync.yml.example .github/workflows/strava-sync.yml
   ```

2. Edit `.github/workflows/strava-sync.yml` and replace:
   - `YOUR_PROJECT_REF` with your actual project reference
   
3. Add secrets to your GitHub repository:
   - Go to your repo → **Settings** → **Secrets and variables** → **Actions**
   - Add:
     - `SUPABASE_URL`: `https://YOUR_PROJECT_REF.supabase.co`
     - `CRON_SECRET`: The same secret you set in Step 4

4. Commit and push:
   ```bash
   git add .github/workflows/strava-sync.yml
   git commit -m "Add Strava auto-sync workflow"
   git push
   ```

## Step 6: Test the Function

You can manually test the function:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/strava-auto-sync
```

Expected response:
```json
{
  "message": "Strava auto-sync completed",
  "total_users": 1,
  "successful": 1,
  "failed": 0,
  "total_activities_synced": 5,
  "results": [...]
}
```

## Verify Cron Job is Running

### For pg_cron:
```sql
SELECT * FROM cron.job WHERE jobname = 'strava-auto-sync-hourly';
```

### For GitHub Actions:
Check the **Actions** tab in your GitHub repository to see if the workflow is running hourly.

## Troubleshooting

- **Function not found**: Make sure you deployed the function with `supabase functions deploy strava-auto-sync`
- **Unauthorized**: Check that `CRON_SECRET` matches in both the function secrets and cron job
- **No activities synced**: Verify users have active Strava connections in the `fitness_providers` table
- **Rate limit errors**: The function processes users sequentially with delays to avoid Strava rate limits

## Next Steps

After deployment:
1. Activities posted to Strava will sync automatically within 1 hour
2. Users can still manually sync via the Settings page
3. Check Edge Function logs in Supabase dashboard for sync status

