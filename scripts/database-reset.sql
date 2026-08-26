-- VakifApp Pre-Store Database Reset Script
-- Target: Supabase (Postgres)
-- WARNING: This will permanently delete data for the specified vakif_id.

-- USAGE:
-- 1. Replace 'YOUR_VAKIF_ID_HERE' with the actual UUID of the Vakif.
-- 2. Replace 'ADEM_USER_ID_HERE' with the Supabase Auth UUID of adem@outlook.com.

/*
DO $$ 
DECLARE 
    v_id UUID := 'YOUR_VAKIF_ID_HERE';
    admin_id UUID := 'ADEM_USER_ID_HERE';
BEGIN
    -- 1. DELETE TEST TRANSACTION DATA
    DELETE FROM transactions WHERE vakif_id = v_id;
    
    -- 2. DELETE TEST READING DATA
    DELETE FROM reading_logs WHERE vakif_id = v_id;
    DELETE FROM contact_readings WHERE contact_id IN (SELECT id FROM contacts WHERE vakif_id = v_id);
    DELETE FROM contacts WHERE vakif_id = v_id;
    
    -- 3. DELETE OTHER MODULE TEST DATA
    DELETE FROM assignments WHERE vakif_id = v_id;
    DELETE FROM decisions WHERE vakif_id = v_id;
    DELETE FROM announcements WHERE vakif_id = v_id;
    DELETE FROM hatims WHERE vakif_id = v_id;
    
    -- 4. CLEANUP BAD DATA (Sanitization)
    -- Fix legacy rows with NULL dates
    UPDATE transactions SET date = created_at::date WHERE date IS NULL AND vakif_id = v_id;

    -- 5. MEMBERSHIP RESET (Adem Kaleoğlu only)
    DELETE FROM vakif_memberships WHERE vakif_id = v_id AND user_id <> admin_id;
    
    -- Ensure Adem has high-level role
    INSERT INTO vakif_memberships (vakif_id, user_id, role) 
    VALUES (v_id, admin_id, 'admin')
    ON CONFLICT (vakif_id, user_id) DO UPDATE SET role = 'admin';

    RAISE NOTICE 'Vakif cleanup completed for ID: %', v_id;
END $$;
*/

-- CLIENT-SIDE RESET INSTRUCTIONS (For Manual Execution):
-- 1. Logout from the app.
-- 2. (Android) App Info > Storage > Clear Data (Wipes SQLite and Cache).
-- 3. (Dev Tools) If available, use "Reset Local Database" but the OS-level clear is safer.
-- 4. Re-login as adem@outlook.com to start fresh.
