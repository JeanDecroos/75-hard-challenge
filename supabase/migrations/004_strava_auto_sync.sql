-- Set up automatic Strava sync to run hourly
-- This syncs activities for all users with active Strava connections

-- Note: pg_cron extension must be enabled in your Supabase project
-- Run this in Supabase SQL Editor or via migration

-- Option 1: Using pg_cron extension (if available in your Supabase plan)
-- Uncomment and adjust the URL and secret below:

/*
SELECT cron.schedule(
  'strava-auto-sync-hourly',
  '0 * * * *',  -- Every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
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
*/

-- Option 2: Use an external cron service
-- Recommended services:
-- - Vercel Cron (if deploying frontend to Vercel)
-- - GitHub Actions (free, runs on schedule)
-- - AWS EventBridge
-- - Upstash QStash
-- - EasyCron
-- - Cron-job.org

-- Example GitHub Action workflow (create .github/workflows/strava-sync.yml):
/*
name: Strava Auto Sync
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Strava Sync
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/strava-auto-sync
*/

-- To check if cron job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'strava-auto-sync-hourly';

-- To unschedule the cron job:
-- SELECT cron.unschedule('strava-auto-sync-hourly');
