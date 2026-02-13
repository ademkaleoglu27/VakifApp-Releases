-- =====================================================
-- FIX TENANT ISOLATION (RLS)
-- =====================================================

-- 1. Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (to be safe)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same vakif" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. Create Strict Isolation Policy
-- "I can see a profile IF it is ME OR they are in MY vakif"
CREATE POLICY "Users can view profiles in same vakif"
ON public.profiles
FOR SELECT
USING (
  -- Rule 1: It is my own profile
  auth.uid() = id
  OR
  -- Rule 2: We share the same vakif_id
  vakif_id = (
    SELECT vakif_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- 4. Allow UPDATE only for self or admins of that vakif
-- (Simplified for now: Users edit self, Admins handled via RPC usually or distinct policy)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING ( auth.uid() = id );
