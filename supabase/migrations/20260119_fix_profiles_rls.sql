-- =====================================================
-- FIX PROFILES RLS POLICIES
-- Date: 2026-01-19
-- Description: Explicitly grant permissions for profiles table
-- so that Edge Functions and Admin UI can access user data.
-- =====================================================

-- 1. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Helper Function to safely check admin status (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('mesveret_admin', 'platform_admin')
  )
$$;

-- 3. Policy: Users can read their own profile
-- Essential for Edge Function authentication checks
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- 4. Policy: Admins can read ALL profiles
-- Essential for the "Heyetler" list view
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin_safe());

-- 5. Policy: Admins can update profiles (Basic Info)
-- Essential for editing Name/Phone of other users
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
    FOR UPDATE USING (public.is_admin_safe());

-- 6. Policy: Users can update their own profile (Basic Info)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
