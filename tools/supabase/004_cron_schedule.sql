-- 004_cron_schedule.sql

-- Enable pg_cron extension if not enabled
create extension if not exists pg_cron;

-- 1. Weekly Generator (Run every Monday at 08:00 AM)
-- Assumes you have deployed the function and have the URL and Service Key
-- SELECT cron.schedule(
--   'weekly-duty-generation',
--   '0 8 * * 1',
--   $$
--   select
--     net.http_post(
--         url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/duty_cron',
--         headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}',
--         body:='{"type": "generate"}'
--     ) as request_id;
--   $$
-- );

-- 2. Hourly Expiration Check
-- SELECT cron.schedule(
--   'hourly-duty-check',
--   '0 * * * *',
--   $$
--   select
--     net.http_post(
--         url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/duty_cron',
--         headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}',
--         body:='{"type": "expire"}'
--     ) as request_id;
--   $$
-- );

-- NOTE: Since we cannot know the Project Ref here, the user must configure this manually or via the Supabase Dashboard UI > Integrations > Cron.
-- This file serves as the specification for what needs to be scheduled.
