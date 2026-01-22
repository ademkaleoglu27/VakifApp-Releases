-- DIAGNOSE PROFILES TABLE
-- Run this in Supabase SQL Editor to see what columns and constraints really exist.

DO $$
DECLARE
    r RECORD;
    c_count INT;
BEGIN
    RAISE NOTICE '--- CHECKING PROFILES TABLE ---';
    
    FOR r IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    LOOP
        RAISE NOTICE 'Column: % (%)', r.column_name, r.data_type;
    END LOOP;

    RAISE NOTICE '--- CHECKING CONSTRAINTS ---';
    FOR r IN
        SELECT conname, pg_get_constraintdef(oid) as def
        FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
    LOOP
        RAISE NOTICE 'Constraint: % = %', r.conname, r.def;
    END LOOP;

    RAISE NOTICE '--- FINDING VAKIF ---';
    FOR r IN SELECT * FROM public.vakiflar WHERE name ILIKE '%Kuzey%' LOOP
        RAISE NOTICE 'Vakif Found: % (ID: %)', r.name, r.id;
    END LOOP;

END $$;
