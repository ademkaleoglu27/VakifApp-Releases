-- =====================================================
-- Promote User to Platform Admin (Replication Mode)
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Switch to 'replica' mode (Bypasses all triggers safely)
SET session_replication_role = replica;

-- 2. Update Profile Role
UPDATE public.profiles
SET role = 'platform_admin',
    vakif_id = '00000000-0000-0000-0000-000000000001'
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'ademkaleoglu@outlook.com'
);

-- 3. Validation: Verify the update happened (should return 'platform_admin')
SELECT email, role as "NEW_ROLE", vakif_id 
FROM public.profiles 
JOIN auth.users ON public.profiles.id = auth.users.id
WHERE email = 'ademkaleoglu@outlook.com';

-- 4. Switch back to 'origin' mode (Important!)
SET session_replication_role = origin;
