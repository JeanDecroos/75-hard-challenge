-- Set up automatic Strava sync cron job
-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_CRON_SECRET before running this!

-- Step 1: Enable pg_cron extension (if not already enabled)
-- This may require Superuser privileges or may already be enabled
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Schedule the hourly sync job
-- Replace the placeholders below:
--   YOUR_PROJECT_REF: Your Supabase project reference (e.g., "abcdefghijklmnop")
--   YOUR_CRON_SECRET: The CRON_SECRET you set in Edge Function secrets

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

-- To verify the cron job was created:
-- SELECT * FROM cron.job WHERE jobname = 'strava-auto-sync-hourly';

-- To unschedule the cron job (if needed):
-- SELECT cron.unschedule('strava-auto-sync-hourly');

