-- 20260225_fix_reading_logs_insert_rls.sql
-- Fixes the RLS policy that requires users to be in vakif_memberships to insert logs.
-- We want to allow reading_logs insertion for the user's default/selected vakif_id
-- without strictly enforcing the vakif_memberships table row yet (since it's a new feature).

BEGIN;

-- Drop the old strict policy from 20260120_centralized_stats.sql
DROP POLICY IF EXISTS "Users can insert reading logs for their vakif" ON public.reading_logs;
DROP POLICY IF EXISTS "Users can view reading logs of their vakif" ON public.reading_logs;

-- Re-apply a broader insert policy: Any authenticated user can insert logs for themselves.
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.reading_logs;

CREATE POLICY "Enable insert for all authenticated users" 
ON public.reading_logs 
FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' 
    AND auth.uid() = user_id
);

-- Ensure users can view their own logs and logs of their vakif
DROP POLICY IF EXISTS "Users can view reading logs" ON public.reading_logs;

CREATE POLICY "Users can view reading logs" 
ON public.reading_logs 
FOR SELECT 
USING (
    -- Can see their own logs
    auth.uid() = user_id 
    OR
    -- Or can see logs in the same vakif if they are a member (legacy rule fallback)
    EXISTS (
        SELECT 1 FROM public.vakif_memberships 
        WHERE user_id = auth.uid() AND vakif_id = reading_logs.vakif_id
    )
    OR
    -- Or if they share the same vakif_id in their profile
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND vakif_id = reading_logs.vakif_id
    )
    OR
    -- Fallback: If it's the global default vakif
    reading_logs.vakif_id = '00000000-0000-0000-0000-000000000001'::uuid
);


-- Update Policy: Users can update their own logs
DROP POLICY IF EXISTS "Users can update their own logs" ON public.reading_logs;

CREATE POLICY "Users can update their own logs" 
ON public.reading_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

COMMIT;
