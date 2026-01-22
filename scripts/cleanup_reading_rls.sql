-- =====================================================
-- CLEANUP READING LOGS INSERT POLICIES
-- Purpose: Remove duplicates, keep one clean rule.
-- =====================================================

-- 1. Drop all existing INSERT policies (cleaning the mess)
DROP POLICY IF EXISTS "Users can insert own logs" ON public.reading_logs;
DROP POLICY IF EXISTS "Users can insert reading logs for their vakif" ON public.reading_logs;
DROP POLICY IF EXISTS "Users can insert their own reading logs" ON public.reading_logs;
DROP POLICY IF EXISTS "Users can insert their own readings" ON public.reading_logs; -- (If exists)
DROP POLICY IF EXISTS "Users can insert own reading logs" ON public.reading_logs;

-- 2. Create ONE unified INSERT policy
-- Rule: You can insert a log IF:
--   a) The user_id matches your Auth ID
--   b) AND you are actually a member of the vakif you claim to be inserting for.
CREATE POLICY "Users can insert logs for their vakif" ON public.reading_logs
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.vakif_memberships vm
    WHERE vm.user_id = auth.uid()
    AND vm.vakif_id = reading_logs.vakif_id
  )
);
