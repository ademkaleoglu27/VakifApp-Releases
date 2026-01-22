-- =====================================================
-- CHECK KUZEY SEHIR & ADMIN STATUS (FIXED)
-- Run this in Supabase SQL Editor
-- =====================================================

DO $$
DECLARE
    v_id UUID;
    r RECORD;
BEGIN
    RAISE NOTICE '--- 1. CHECKING VAKIF ---';
    
    SELECT id INTO v_id FROM public.vakiflar WHERE name ILIKE '%Kuzey%' LIMIT 1;
    
    IF v_id IS NOT NULL THEN
        RAISE NOTICE '✅ Kuzey Şehir Found. ID: %', v_id;
    ELSE
        RAISE NOTICE '❌ Kuzey Şehir NOT FOUND.';
        RETURN;
    END IF;

    RAISE NOTICE '--- 2. LISTING ADMINS IN THIS VAKIF ---';
    -- Lists profiles who are linked to this vakif AND have admin/privileged roles
    FOR r IN 
        SELECT p.display_name, p.role, p.id, p.vakif_id
        FROM public.profiles p
        WHERE p.vakif_id = v_id
    LOOP
        RAISE NOTICE 'User: % | Role: % | VakifMatch: %', r.display_name, r.role, (r.vakif_id = v_id);
    END LOOP;

    RAISE NOTICE '--- 3. CHECKING MEMBERSHIPS ---';
    -- Removed 'status' column as it does not exist
    FOR r IN
        SELECT p.display_name, vm.role as member_role
        FROM public.vakif_memberships vm
        JOIN public.profiles p ON p.id = vm.user_id
        WHERE vm.vakif_id = v_id
    LOOP
        RAISE NOTICE 'Member: % | Role: %', r.display_name, r.member_role;
    END LOOP;

END $$;
