-- =====================================================
-- RESET VAKIF DATA SCRIPT (PRE-STORE CLEANUP)
-- WARNING: This will DELETE all data for the specified Vakif except the Admin!
-- Usage: Replace :vakif_id and :admin_user_id with actual UUIDs.
-- =====================================================

-- 1. Setup Variables (Uncomment and set these in your SQL editor if supported, or manually replace below)
-- \set vakif_id 'YOUR_VAKIF_UUID'
-- \set admin_id 'YOUR_ADMIN_UUID'

BEGIN;

-- 2. DELETE Reading Logs
DELETE FROM public.reading_logs 
WHERE vakif_id = '00000000-0000-0000-0000-000000000001'; -- Replace with actual ID

-- 3. DELETE Transactions
DELETE FROM public.transactions 
WHERE vakif_id = '00000000-0000-0000-0000-000000000001'; -- Replace with actual ID

-- 4. DELETE Contacts (Legacy)
DELETE FROM public.contacts 
WHERE vakif_id = '00000000-0000-0000-0000-000000000001'; -- Replace with actual ID

DELETE FROM public.contact_readings 
WHERE vakif_id = '00000000-0000-0000-0000-000000000001'; -- Replace with actual ID

-- 5. DELETE Memberships (Everyone except Admin)
-- REPLACE 'ADMIN_UUID_HERE' with the actual Admin User ID
DELETE FROM public.vakif_memberships 
WHERE vakif_id = '00000000-0000-0000-0000-000000000001' 
AND user_id <> 'ADMIN_UUID_HERE';

-- 6. Ensure Admin is Owner
-- REPLACE 'ADMIN_UUID_HERE' with the actual Admin User ID
UPDATE public.vakif_memberships
SET role = 'owner'
WHERE vakif_id = '00000000-0000-0000-0000-000000000001' 
AND user_id = 'ADMIN_UUID_HERE';

COMMIT;

-- =====================================================
-- DONE
-- =====================================================
