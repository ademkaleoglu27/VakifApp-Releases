-- =====================================================
-- SAFE CLEANUP & RESET SCRIPT (Pre-Release / Factory Reset)
-- =====================================================
-- WARNING: This script deletes data! Run with caution.
-- Ideally backup your database before running this.

BEGIN;

-- 1. DELETE ACTIVITY DATA (Reset User Progress)
-- Keeps the Users and Vakifs, but clears all reading logs and hatim parts.
-- Use this to 'reset' the counters for a fresh start.

TRUNCATE TABLE public.reading_logs CASCADE;
TRUNCATE TABLE public.hatim_parts CASCADE;
TRUNCATE TABLE public.user_hatims CASCADE;
-- TRUNCATE TABLE public.notifications CASCADE; -- Uncomment to clear notification history

-- 2. (Optional) DELETE TEST ACCOUNTS
-- If you want to delete specific test users.
-- Note: Deleting from auth.users requires 'supabase_admin' role or special handling.
-- Doing it via public schema (profiles) will trigger cascades if set up, but auth.users is the source.

-- Only deleting from public profile won't delete the Login.
-- To delete test users properly, you usually use the Supabase Dashboard > Authentication > Users.
-- Or use the Admin Panel 'Delete User' feature (which we can build).

-- 3. (Optional) DELETE TEST VAKIFS
-- Be careful! This will cascade delete members of that vakif if constraints allow.

-- DELETE FROM public.vakiflar WHERE code LIKE 'TEST%';
-- DELETE FROM public.vakiflar WHERE code = 'DENEME_VAKFI';


-- 4. RESET SEQUENCES (If applicable)
-- If you have auto-increment IDs (though we use UUIDs mostly), reset them here.

COMMIT;

-- =====================================================
-- EXPLANATION
-- =====================================================
-- 1. Supabase Deletion Error:
--    You likely got errors because of Foreign Key Constraints.
--    (e.g. You can't delete a Vakif if it has Members. You can't delete a User if they have Logs).
--    To fix this, we need a 'Cascading Delete' logic.

-- 2. Advice for "Clean Slate" (Mağazaya Çıkmadan Önce):
--    Run the TRUNCATE commands above (Step 1).
--    This keeps your Accounts and Vakif configurations active, but resets all scores to 0.
--    It is the safest way to "Start Fresh" without breaking the system.
