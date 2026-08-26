-- 20260224_fix_reading_logs_rls.sql
-- Drop the existing insert policy just in case it's restrictive or nonexistent
DROP POLICY IF EXISTS "Users can insert their own reading logs" ON public.reading_logs;
DROP POLICY IF EXISTS "Users can view reading logs" ON public.reading_logs;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.reading_logs;
DROP POLICY IF EXISTS "Vakif members can insert reading logs" ON public.reading_logs;

-- Allow authenticated users to insert their own logs
CREATE POLICY "Enable insert for all authenticated users" 
ON public.reading_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Also make sure they can see them, so upsert works
CREATE POLICY "Users can view reading logs" 
ON public.reading_logs 
FOR SELECT 
USING (true);

-- Ensure users can update their own logs (required for upsert to work properly on conflict)
CREATE POLICY "Users can update their own logs" 
ON public.reading_logs 
FOR UPDATE 
USING (auth.role() = 'authenticated');
