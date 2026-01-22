-- =====================================================
-- DIAGNOSE INSERT ERROR (Run in Supabase SQL Editor)
-- =====================================================

DO $$
DECLARE
    v_id UUID;
    fake_user_id UUID := gen_random_uuid(); -- Generate a fake ID
BEGIN
    RAISE NOTICE '--- TEST START ---';

    -- 1. Get Vakif ID
    SELECT id INTO v_id FROM public.vakiflar WHERE name ILIKE '%Kuzey%' LIMIT 1;
    RAISE NOTICE 'Vakif ID: %', v_id;

    -- 2. Attempt Profile Insert
    RAISE NOTICE 'Attempting Profile Insert...';
    BEGIN
        INSERT INTO public.profiles (id, display_name, vakif_id, role)
        VALUES (fake_user_id, 'Test User', v_id, 'member');
        RAISE NOTICE '✅ Profile Insert SUCCESS';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Profile Insert FAILED: % %', SQLERRM, SQLSTATE;
    END;

    -- 3. Attempt Membership Insert
    RAISE NOTICE 'Attempting Membership Insert...';
    BEGIN
        INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
        VALUES (fake_user_id, v_id, 'member');
        RAISE NOTICE '✅ Membership Insert SUCCESS';
    EXCEPTION WHEN OTHERS THEN
         -- Common error: foreign key if profile insert failed previously (expected if step 2 failed)
        RAISE NOTICE '❌ Membership Insert FAILED: % %', SQLERRM, SQLSTATE;
    END;
    
    -- Cleanup (Rollback check)
    RAISE NOTICE '--- CLEANUP ---';
    -- We are in a transaction block usually in SQL check, but let's just error out to rollback changes or delete
    DELETE FROM public.profiles WHERE id = fake_user_id;

END $$;
