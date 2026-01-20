-- =====================================================
-- FIX: RLS Infinite Recursion on vakif_memberships
-- Error: 42P17 - infinite recursion detected in policy
-- Root Cause: vakif_memberships SELECT policy references itself
-- =====================================================

-- 1. Drop the problematic self-referential policy
DROP POLICY IF EXISTS "Vakif members can view membership list" ON public.vakif_memberships;

-- 2. Create a simple, non-recursive policy
-- Users can view memberships where they are the member (direct check, no subquery on same table)
CREATE POLICY "Users can view own memberships" ON public.vakif_memberships
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- 3. Add a separate policy to allow viewing co-members in the same vakif
-- This uses a function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_vakif_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT vakif_id FROM public.vakif_memberships WHERE user_id = auth.uid();
$$;

-- Now create policy using the function (breaks recursion because function is SECURITY DEFINER)
DROP POLICY IF EXISTS "Users can view co-members" ON public.vakif_memberships;
CREATE POLICY "Users can view co-members" ON public.vakif_memberships
    FOR SELECT USING (
        vakif_id IN (SELECT public.get_user_vakif_ids())
    );

-- 4. Fix reading_logs INSERT policy to use the same helper function
DROP POLICY IF EXISTS "Users can insert reading logs for their vakif" ON public.reading_logs;
CREATE POLICY "Users can insert reading logs for their vakif" ON public.reading_logs
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        vakif_id IN (SELECT public.get_user_vakif_ids())
    );

-- 5. Fix reading_logs SELECT policy
DROP POLICY IF EXISTS "Users can view reading logs of their vakif" ON public.reading_logs;
CREATE POLICY "Users can view reading logs of their vakif" ON public.reading_logs
    FOR SELECT USING (
        vakif_id IN (SELECT public.get_user_vakif_ids())
    );

-- 6. Verification
SELECT 'RLS policies fixed!' as status;
