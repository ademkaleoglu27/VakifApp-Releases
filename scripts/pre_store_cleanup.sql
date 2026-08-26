-- =====================================================
-- PRE-STORE CLEANUP & HARDENING SCRIPT (SINGLE TENANT)
-- Target: Supabase SQL Editor (Run Once)
-- Operations: 
--   1. Ensure Default Vakif & Admin Membership
--   2. Clean Public Tables (Logs, Contacts, Transactions)
--   3. Clean Orphan Profiles & Memberships
--   4. Harden Constraints (NOT NULL + Defaults)
--   5. Verify State
-- =====================================================

BEGIN;

-- VARIABLES (For documentation, used directly in queries below)
-- Default Vakif ID: '00000000-0000-0000-0000-000000000001'
-- Admin ID: '087a04dc-a321-431a-904b-054fa8ecba26'

-- 1. ENSURE DEFAULT VAKIF
-- =====================================================
INSERT INTO public.vakiflar (id, name, code, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'Default Vakif', 
    'default', 
    true
)
ON CONFLICT (id) DO NOTHING;

-- 2. ENSURE ADMIN MEMBERSHIP (Owner)
-- =====================================================
INSERT INTO public.vakif_memberships (vakif_id, user_id, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '087a04dc-a321-431a-904b-054fa8ecba26',
    'owner'
)
ON CONFLICT (vakif_id, user_id) 
DO UPDATE SET role = 'owner';

-- 3. CLEANUP PUBLIC DATA (Default Vakif Scope)
-- =====================================================

-- Clean reading_logs (All for default vakif)
DELETE FROM public.reading_logs 
WHERE vakif_id = '00000000-0000-0000-0000-000000000001';

-- Safe cleanup for optional tables if they exist
DO $$
BEGIN
    -- Transactions
    IF to_regclass('public.transactions') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.transactions WHERE vakif_id = ''00000000-0000-0000-0000-000000000001''';
    END IF;

    -- Contacts
    IF to_regclass('public.contacts') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.contacts WHERE vakif_id = ''00000000-0000-0000-0000-000000000001''';
    END IF;

    -- Contact Readings
    IF to_regclass('public.contact_readings') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.contact_readings WHERE vakif_id = ''00000000-0000-0000-0000-000000000001''';
    END IF;
END $$;

-- 4. CLEANUP ORPHAN & NON-ADMIN MEMBERS (Ghost Data)
-- =====================================================

-- Remove all members from Default Vakif except Admin
DELETE FROM public.vakif_memberships 
WHERE vakif_id = '00000000-0000-0000-0000-000000000001' 
AND user_id <> '087a04dc-a321-431a-904b-054fa8ecba26';

-- Remove orphan keys from reading_logs (safety check before constraint)
DELETE FROM public.reading_logs
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Remove memberships for users that don't exist in auth (Ghosts)
DELETE FROM public.vakif_memberships
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Remove Profiles that don't have an auth user (Ghosts) - EXCEPT Admin
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users)
AND id <> '087a04dc-a321-431a-904b-054fa8ecba26';

-- 5. HARDENING & CONSTRAINTS
-- =====================================================

DO $$
BEGIN
    -- Check if reading_logs exists
    IF to_regclass('public.reading_logs') IS NOT NULL THEN
        
        -- Backfill Vakif ID
        EXECUTE 'UPDATE public.reading_logs SET vakif_id = ''00000000-0000-0000-0000-000000000001'' WHERE vakif_id IS NULL';
        
        -- Cleanup User ID (Double check)
        EXECUTE 'DELETE FROM public.reading_logs WHERE user_id IS NULL';

        -- Apply Defaults & Constraints
        EXECUTE 'ALTER TABLE public.reading_logs ALTER COLUMN vakif_id SET DEFAULT ''00000000-0000-0000-0000-000000000001''';
        EXECUTE 'ALTER TABLE public.reading_logs ALTER COLUMN vakif_id SET NOT NULL';
        EXECUTE 'ALTER TABLE public.reading_logs ALTER COLUMN user_id SET NOT NULL';
        
    END IF;
END $$;

COMMIT;

-- 6. VERIFICATION (Run immediately after commit)
-- =====================================================

-- Verify Members count (Should be 1 -> Admin)
SELECT count(*) as members_count FROM public.vakif_memberships 
WHERE vakif_id = '00000000-0000-0000-0000-000000000001';

-- Verify Reading Logs count (Should be 0 cleaned)
SELECT count(*) as global_logs_count FROM public.reading_logs;

-- Verify RPC Access (Simulate Admin Request)
-- Note: set_config is transaction-local, useful for testing RLS/RPC in editor
SELECT 
    set_config('request.jwt.claim.sub', '087a04dc-a321-431a-904b-054fa8ecba26', true),
    set_config('request.jwt.claim.role', 'authenticated', true);

SELECT * FROM public.get_reading_leaderboard(
    '00000000-0000-0000-0000-000000000001', 
    'week', 
    10, 
    true
);
