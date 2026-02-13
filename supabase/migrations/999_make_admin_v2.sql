-- =====================================================
-- FIX: Update Role Constraint & Promote Admin
-- Run this in Supabase SQL Editor
-- =====================================================

BEGIN;

-- 1. Drop the old constraint that limits roles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Add new constraint including 'platform_admin' & 'guest'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('sohbet_member', 'mesveret_admin', 'accountant', 'platform_admin', 'guest'));

-- 3. Now promote the user (Bypassing triggers just in case)
SET session_replication_role = replica;

UPDATE public.profiles
SET role = 'platform_admin',
    vakif_id = '00000000-0000-0000-0000-000000000001'
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'ademkaleoglu@outlook.com'
);

SET session_replication_role = origin;

COMMIT;

-- 4. Verify
SELECT email, role 
FROM public.profiles 
JOIN auth.users ON public.profiles.id = auth.users.id
WHERE email = 'ademkaleoglu@outlook.com';
