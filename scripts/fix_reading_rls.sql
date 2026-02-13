-- =====================================================
-- FIX READING LOGS RLS (Ensure Members Can Add Readings)
-- Date: 2026-01-21
-- Description: 
-- 1. Enables RLS on reading_logs.
-- 2. Adds policy allowing users to INSERT if they are authenticated (and match user_id).
-- 3. Adds policy for SELECT/UPDATE own logs.
-- =====================================================

BEGIN;

-- 1. READING LOGS RLS
ALTER TABLE public.reading_logs ENABLE ROW LEVEL SECURITY;

-- Allow INSERT if user owns the record
DROP POLICY IF EXISTS "Users can insert their own readings" ON public.reading_logs;
CREATE POLICY "Users can insert their own readings"
ON public.reading_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
);

-- Allow SELECT own readings
DROP POLICY IF EXISTS "Users can view their own readings" ON public.reading_logs;
CREATE POLICY "Users can view their own readings"
ON public.reading_logs
FOR SELECT
TO authenticated
USING ( auth.uid() = user_id );

-- Allow UPDATE own readings
DROP POLICY IF EXISTS "Users can update their own readings" ON public.reading_logs;
CREATE POLICY "Users can update their own readings"
ON public.reading_logs
FOR UPDATE
TO authenticated
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

-- Allow DELETE own readings
DROP POLICY IF EXISTS "Users can delete their own readings" ON public.reading_logs;
CREATE POLICY "Users can delete their own readings"
ON public.reading_logs
FOR DELETE
TO authenticated
USING ( auth.uid() = user_id );


-- 2. CONTACT READINGS RLS (If used)
ALTER TABLE public.contact_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage contact readings" ON public.contact_readings;
CREATE POLICY "Users can manage contact readings"
ON public.contact_readings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

COMMIT;
