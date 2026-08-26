-- =====================================================
-- FIX OWNER ROLE
-- Date: 2026-01-21
-- Description: 
-- The role 'owner' is not standard in our types.
-- We convert it to 'platform_admin' (The highest level).
-- =====================================================

BEGIN;

-- 1. Update Profile Role
UPDATE public.profiles
SET role = 'platform_admin'
WHERE role = 'owner';

-- 2. Update Membership Role
UPDATE public.vakif_memberships
SET role = 'platform_admin'
WHERE role = 'owner';

-- 3. Verify
SELECT * FROM public.profiles WHERE role = 'platform_admin';

COMMIT;
