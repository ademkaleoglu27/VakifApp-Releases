-- =====================================================
-- FORCE SINGLE TENANT: KUZEY SEHIR MEDRESESI
-- Date: 2026-01-21
-- Description: Locks the entire database to a single Vakif ID.
-- FIXED: Removed "DO" block to prevent $$ syntax errors.
-- =====================================================

BEGIN;

-- 1. Create or Update the Vakif Record (Master ID: 00000000-0000-0000-0000-000000000001)
INSERT INTO public.vakiflar (id, name, code, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Kuzey Şehir Medresesi', 'KUZEY', NOW())
ON CONFLICT (id) DO UPDATE
SET name = 'Kuzey Şehir Medresesi',
    code = 'KUZEY';

-- 2. Force ALL Profiles to this Vakif
UPDATE public.profiles
SET vakif_id = '00000000-0000-0000-0000-000000000001'
WHERE vakif_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000001';

-- 3. Fix Data Ownership (Reading Logs)
UPDATE public.reading_logs
SET vakif_id = '00000000-0000-0000-0000-000000000001'
WHERE vakif_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000001';

-- 4. Fix Announcements
UPDATE public.announcements
SET vakif_id = '00000000-0000-0000-0000-000000000001'
WHERE vakif_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000001';

-- 5. Trigger: Strict Enforcement
-- Update the trigger function to DEFAULT to this Master ID explicitly.
CREATE OR REPLACE FUNCTION public.set_reading_log_vakif_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.vakif_id IS NULL THEN
        NEW.vakif_id := '00000000-0000-0000-0000-000000000001'; -- Hardcoded Master ID
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Trigger binding is persistent from previous script)

COMMIT;

-- 6. Verification Output
SELECT count(*) as migrated_users FROM public.profiles WHERE vakif_id = '00000000-0000-0000-0000-000000000001';
