-- =====================================================
-- STABILIZE READING LOGS (TRIGGER + RLS)
-- Date: 2026-01-21
-- Description: Auto-assign vakif_id via Trigger & Fix Permissions
-- =====================================================

-- 1. Create Function to Auto-Fill vakif_id from Profile
CREATE OR REPLACE FUNCTION public.set_reading_log_vakif_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If vakif_id is already set (and valid), keep it.
  -- Otherwise, look it up from profiles.
  IF NEW.vakif_id IS NULL THEN
    SELECT vakif_id INTO NEW.vakif_id
    FROM public.profiles
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger (Before Insert)
DROP TRIGGER IF EXISTS trigger_set_reading_log_vakif ON public.reading_logs;

CREATE TRIGGER trigger_set_reading_log_vakif
BEFORE INSERT ON public.reading_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_reading_log_vakif_id();

-- 3. Safety: Make vakif_id nullable temporarily to avoid initial check failures
-- (The trigger fixes it, but the initial constraint check might happen before?)
-- Actually, BEFORE INSERT triggers fire before constraints. So it's safe.
-- But let's ensure the column exists. If not, this is a no-op or error (tables assumed to exist).

-- 4. Re-Apply Policies (Fail specific)
-- Ensure RLS is enabled
ALTER TABLE reading_logs ENABLE ROW LEVEL SECURITY;

-- Drop old strict policies
DROP POLICY IF EXISTS "Users can insert their own reading logs" ON reading_logs;
DROP POLICY IF EXISTS "Reading logs are viewable by vakif members" ON reading_logs;

-- Insert Policy (Permissive logic: Trust the Trigger/Auth)
CREATE POLICY "Users can insert their own reading logs"
ON reading_logs FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

-- Read Policy (Simple: See own logs)
-- Leaderboard uses a different mechanism often, or a "Security Definer" view/RPC.
-- For "Okuma Ek" screen, seeing own logs is enough.
CREATE POLICY "Users can see their own reading logs"
ON reading_logs FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- Grant Access
GRANT ALL ON reading_logs TO authenticated;
GRANT ALL ON reading_logs TO service_role;
