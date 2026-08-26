-- =====================================================
-- DIAGNOSE MULTI-TENANT REGISTRATION
-- =====================================================

-- 1. Check if Vakif Codes Exist
SELECT id, name, code, is_active 
FROM public.vakiflar 
WHERE code IN ('KUZEY1453', 'MISAFIR');

-- 2. Check the last few users to see what happened
SELECT 
  p.id, 
  p.display_name, 
  p.vakif_id, 
  v.name as vakif_name,
  p.role,
  p.created_at
FROM public.profiles p
LEFT JOIN public.vakiflar v ON p.vakif_id = v.id
ORDER BY p.created_at DESC
LIMIT 5;

-- 3. Check for any NULL code vakifs (Potential Issue)
SELECT count(*) as null_code_count FROM public.vakiflar WHERE code IS NULL;
