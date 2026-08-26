-- =====================================================
-- MULTI-TENANT PHASE 1: SETUP & SECURITY
-- Date: 2026-01-21
-- Description:
-- 1. Adds 'code' column to 'vakiflar' (for Join Code).
-- 2. Sets default code 'KUZEY1453' for the master tenant.
-- 3. FIXES CRITICAL RLS GAPS (Enforces strict isolation).
-- =====================================================

BEGIN;

-- 1. SCHEMA UPDATE: Add 'code' column
-- We verify if column exists first to be idempotent.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vakiflar' AND column_name='code') THEN
        ALTER TABLE public.vakiflar ADD COLUMN code TEXT;
        ALTER TABLE public.vakiflar ADD CONSTRAINT vakiflar_code_unique UNIQUE (code);
    END IF;
END $$;

-- 2. DATA UPDATE: Set Master Tenant Code
UPDATE public.vakiflar
SET code = 'KUZEY1453'
WHERE name ILIKE '%Kuzey%' AND code IS NULL;

-- 3. SECURITY FIX: Reading Logs (Strict Isolation)
-- Drop unsafe policies
DROP POLICY IF EXISTS "Authenticated can view all logs" ON public.reading_logs;
DROP POLICY IF EXISTS "Public Access" ON public.reading_logs;

-- Re-create stricter policy: "View only logs from MY vakif(s)"
DROP POLICY IF EXISTS "Users can view reading logs of their vakif" ON public.reading_logs;
CREATE POLICY "Users can view reading logs of their vakif" ON public.reading_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.vakif_memberships vm
    WHERE vm.user_id = auth.uid()
    AND vm.vakif_id = reading_logs.vakif_id
  )
);

-- 4. SECURITY FIX: Profiles (Strict Isolation)
-- Drop unsafe policies
DROP POLICY IF EXISTS "Public Access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles; 

-- Allow reading OWN profile (always)
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT USING ( id = auth.uid() );

-- Allow reading profiles of CO-MEMBERS (Same Vakif)
CREATE POLICY "Users can view profiles in their vakif" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.vakif_memberships my_vm
    JOIN public.vakif_memberships target_vm ON my_vm.vakif_id = target_vm.vakif_id
    WHERE my_vm.user_id = auth.uid()
    AND target_vm.user_id = profiles.id
  )
);

-- 5. FUNCTION: Join with Code (RPC)
-- This allows the App to join a vakif by code safely.
CREATE OR REPLACE FUNCTION public.join_tenant_with_code(code_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    target_vakif_id UUID;
    result JSONB;
BEGIN
    -- Find Vakif
    SELECT id INTO target_vakif_id FROM public.vakiflar WHERE code = code_input LIMIT 1;

    IF target_vakif_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Geçersiz Vakıf Kodu');
    END IF;

    -- Add Membership (Idempotent)
    INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
    VALUES (auth.uid(), target_vakif_id, 'sohbet_member') -- Default role
    ON CONFLICT (user_id, vakif_id) DO NOTHING;

    -- Update Profile (Optional: Set as current/latest vakif if needed)
    UPDATE public.profiles 
    SET vakif_id = target_vakif_id 
    WHERE id = auth.uid() AND vakif_id IS NULL;

    RETURN jsonb_build_object('success', true, 'vakif_id', target_vakif_id, 'message', 'Katılım Başarılı');
END;
$func$;

COMMIT;
