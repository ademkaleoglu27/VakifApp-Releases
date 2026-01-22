-- =====================================================
-- FIX VAKIF CODES
-- Purpose: Align DB codes with App logic (KUZEY -> KUZEY1453)
-- =====================================================

-- 1. Update Kuzey Sehir to use the correct code 'KUZEY1453'
UPDATE public.vakiflar
SET code = 'KUZEY1453'
WHERE code = 'KUZEY' OR name ILIKE '%Kuzey%';

-- 2. Verify Result
SELECT id, name, code FROM public.vakiflar;
