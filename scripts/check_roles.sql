-- =====================================================
-- CHECK ALLOWED ROLES
-- Run this to see what values are allowed in the 'role' column.
-- =====================================================

SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'profiles_role_check';

-- Also check existing roles in the table to see what's being used
SELECT DISTINCT role FROM public.profiles;
