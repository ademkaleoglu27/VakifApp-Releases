-- =====================================================
-- MANUAL TRIGGER TEST & DIAGNOSIS
-- =====================================================

-- 1. Explicitly check the codes again (be sure case matches)
SELECT id, name, code 
FROM public.vakiflar 
WHERE name ILIKE '%Kuzey%' OR name ILIKE '%Misafir%';

-- 2. Simulate Trigger Logic Manually (to catch the error)
DO $$
DECLARE
    v_id UUID;
    v_code TEXT := 'KUZEY1453'; -- Try 'MISAFIR' if you want to test that
BEGIN
    -- Try to find ID
    SELECT id INTO v_id FROM public.vakiflar WHERE code = v_code LIMIT 1;
    
    IF v_id IS NULL THEN
        RAISE NOTICE 'Vakif Not Found for Code: %', v_code;
    ELSE
        RAISE NOTICE 'Found Vakif: % (ID: %)', v_code, v_id;
    END IF;
END $$;
