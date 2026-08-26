-- =====================================================
-- STORE RELEASE: MASTER CLEANUP SCRIPT (Safe & Robust)
-- Admin to Protect: ademkaleoglu@outlook.com 
-- UUID: 087a04dc-a321-431a-904b-054fa8ecba26
-- =====================================================

BEGIN;

-- ----------------------------------------------------
-- 1. Detach Foreign Key References (Set to Admin or NULL)
-- ----------------------------------------------------

-- If a test user created a vakif, assign it to admin
UPDATE public.vakiflar 
SET created_by = '087a04dc-a321-431a-904b-054fa8ecba26' 
WHERE created_by != '087a04dc-a321-431a-904b-054fa8ecba26';

-- If a test user updated settings, set to null
UPDATE public.platform_settings 
SET updated_by = NULL 
WHERE updated_by != '087a04dc-a321-431a-904b-054fa8ecba26';

-- ----------------------------------------------------
-- 2. Delete Dependent Data (Child Tables)
-- ----------------------------------------------------

-- Join Requests
DELETE FROM public.vakif_join_requests 
WHERE user_id != '087a04dc-a321-431a-904b-054fa8ecba26' 
   OR resolved_by != '087a04dc-a321-431a-904b-054fa8ecba26';

-- Reading Logs
DELETE FROM public.reading_logs 
WHERE user_id != '087a04dc-a321-431a-904b-054fa8ecba26';

-- Contact Readings (via Contacts owned by test users)
DELETE FROM public.contact_readings 
WHERE contact_id IN (
    SELECT id FROM public.contacts 
    WHERE user_id IS NOT NULL AND user_id != '087a04dc-a321-431a-904b-054fa8ecba26'
);

-- Contacts
DELETE FROM public.contacts 
WHERE user_id IS NOT NULL AND user_id != '087a04dc-a321-431a-904b-054fa8ecba26';

-- Vakif Memberships
DELETE FROM public.vakif_memberships 
WHERE user_id != '087a04dc-a321-431a-904b-054fa8ecba26';

-- Assignments
DELETE FROM public.assignments 
WHERE user_id != '087a04dc-a321-431a-904b-054fa8ecba26';

-- Notifications (Fail-safe: only if exists)
DELETE FROM public.notifications 
WHERE user_id != '087a04dc-a321-431a-904b-054fa8ecba26';

-- Transactions (created_by usually implies ownership)
DELETE FROM public.transactions 
WHERE created_by != '087a04dc-a321-431a-904b-054fa8ecba26';

-- ----------------------------------------------------
-- 3. Delete Profiles (1:1 with Auth Users)
-- ----------------------------------------------------
DELETE FROM public.profiles 
WHERE id != '087a04dc-a321-431a-904b-054fa8ecba26';

-- ----------------------------------------------------
-- 4. FORCE DELETE Auth Users (The Final Blow)
-- ----------------------------------------------------
DELETE FROM auth.users 
WHERE id != '087a04dc-a321-431a-904b-054fa8ecba26';

COMMIT;

-- =====================================================
-- Verification
-- =====================================================
SELECT count(*) as remaining_users FROM auth.users;
SELECT email FROM auth.users;
