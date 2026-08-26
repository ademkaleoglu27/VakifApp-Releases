-- =====================================================
-- FIX READING LOGS RLS POLICIES
-- Date: 2026-01-21
-- Description: Fixes 42501/RLS errors when syncing reading logs
-- =====================================================

-- 1. Enable RLS (Ensure it is on)
ALTER TABLE reading_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Reading logs are viewable by everyone" ON reading_logs;
DROP POLICY IF EXISTS "Users can insert their own reading logs" ON reading_logs;
DROP POLICY IF EXISTS "Users can update their own reading logs" ON reading_logs;
DROP POLICY IF EXISTS "Users can delete their own reading logs" ON reading_logs;

-- 3. Create READ Policy
-- Allow users to see:
-- A) Their own logs
-- B) Logs from other users in the SAME VAKIF (for Leaderboard)
CREATE POLICY "Reading logs are viewable by vakif members"
ON reading_logs FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM profiles p_me
        JOIN profiles p_target ON p_me.vakif_id = p_target.vakif_id
        WHERE p_me.id = auth.uid()
          AND p_target.id = reading_logs.user_id
    )
);

-- 4. Create INSERT Policy
-- Users can insert logs if the user_id matches their auth uid
CREATE POLICY "Users can insert their own reading logs"
ON reading_logs FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() 
    -- Optionally check vakif_id if passed, but typically we trust the user_id link
);

-- 5. Create UPDATE Policy
CREATE POLICY "Users can update their own reading logs"
ON reading_logs FOR UPDATE
TO authenticated
USING ( user_id = auth.uid() )
WITH CHECK ( user_id = auth.uid() );

-- 6. Create DELETE Policy
CREATE POLICY "Users can delete their own reading logs"
ON reading_logs FOR DELETE
TO authenticated
USING ( user_id = auth.uid() );

-- 7. Grant Permissions (Just in case)
GRANT ALL ON reading_logs TO authenticated;
GRANT ALL ON reading_logs TO service_role;
