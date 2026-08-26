-- =====================================================
-- DEBUG REGISTATION FAILURE (CORRECTED)
-- =====================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- 1. LAST 5 USERS (Joined with Profiles) ---';
    
    FOR r IN 
        SELECT 
            au.email, 
            au.raw_user_meta_data, 
            p.role, 
            p.vakif_id,
            v.name as vakif_name
        FROM auth.users au
        LEFT JOIN public.profiles p ON au.id = p.id
        LEFT JOIN public.vakiflar v ON p.vakif_id = v.id
        ORDER BY au.created_at DESC 
        LIMIT 5 
    LOOP
        RAISE NOTICE 'Email: %, Role: %, Vakif: % (ID: %), Metadata: %', 
            r.email, r.role, r.vakif_name, r.vakif_id, r.raw_user_meta_data;
    END LOOP;

    RAISE NOTICE '--- 2. AVAILABLE VAKIF CODES ---';
    FOR r IN SELECT name, code, id FROM public.vakiflar LOOP
        RAISE NOTICE 'Vakif: %, Code: "%" (Length: %)', r.name, r.code, LENGTH(r.code);
    END LOOP;
END $$;
