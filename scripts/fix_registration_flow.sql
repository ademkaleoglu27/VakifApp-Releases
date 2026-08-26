-- =====================================================
-- FIX REGISTRATION FLOW (SINGLE TENANT ENFORCEMENT)
-- Date: 2026-01-21
-- Description: Ensures new users are automatically assigned to Kuzey Sehir.
-- =====================================================

BEGIN;

-- 1. FIX IMMEDIATE PROBLEM: Update 'deneme' and any other strays
UPDATE public.profiles
SET vakif_id = '00000000-0000-0000-0000-000000000001'
WHERE vakif_id IS NULL OR vakif_id != '00000000-0000-0000-0000-000000000001';

-- 2. SAFETY NET: Set Default Value on Column
ALTER TABLE public.profiles
ALTER COLUMN vakif_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- 3. UPDATE TRIGGER FUNCTION (The Root Cause)
-- This function runs when a new user signs up via Auth.
-- We must update it to explicitly force the Master Vakif ID.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, vakif_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    '00000000-0000-0000-0000-000000000001', -- <--- HARDCODED MASTER ID
    'sohbet_member' -- Default Role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- 4. Verification output
SELECT count(*) as corrected_profiles FROM public.profiles WHERE vakif_id = '00000000-0000-0000-0000-000000000001';
