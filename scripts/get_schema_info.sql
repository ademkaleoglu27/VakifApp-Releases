-- =====================================================
-- GET SCHEMA INFO
-- Run this in Supabase SQL Editor and share the Results (bottom section)
-- =====================================================

-- 1. List Columns of PROFILES
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 2. List Columns of VAKIF_MEMBERSHIPS
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'vakif_memberships' AND table_schema = 'public';

-- 3. Check for Kuzey Sehir Vakif
SELECT * FROM public.vakiflar WHERE name ILIKE '%Kuzey%';
