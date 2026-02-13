-- =====================================================
-- FIX RLS RECURSION (Helper Function)
-- =====================================================

-- 1. Create a helper function to get MY vakif_id without triggering RLS
-- SECURITY DEFINER means it runs with the privileges of the creator (postgres/admin),
-- bypassing the RLS on the table it queries.
CREATE OR REPLACE FUNCTION public.get_my_vakif_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT vakif_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Drop existing policy
DROP POLICY IF EXISTS "Users can view profiles in same vakif" ON public.profiles;

-- 3. Re-create Policy using the Helper Function
CREATE POLICY "Users can view profiles in same vakif"
ON public.profiles
FOR SELECT
USING (
  -- Rule 1: It is my own profile
  auth.uid() = id
  OR
  -- Rule 2: We share the same vakif_id (Recursive-safe)
  vakif_id = public.get_my_vakif_id()
);
