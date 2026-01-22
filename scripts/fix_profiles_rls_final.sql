-- =====================================================
-- FIX PROFILES RLS (FINAL CLEANUP)
-- =====================================================
-- The issue: Multiple policies exist. RLS is "OR" logic.
-- If ANY policy allows access, the user sees the data.
-- We must DELETE ALL old policies and keep only the strict one.

-- 1. DROP ALL KNOWN POLICIES (From your screenshot)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same vakif" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own basic info" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their vakif" ON public.profiles; -- Old duplicate

-- 2. Setup Helper (Ensure it exists)
CREATE OR REPLACE FUNCTION public.get_my_vakif_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT vakif_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 3. RE-CREATE THE STRICT POLICY
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

-- 4. RE-CREATE UPDATE POLICY
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING ( auth.uid() = id );
