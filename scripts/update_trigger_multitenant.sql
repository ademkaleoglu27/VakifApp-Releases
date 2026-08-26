-- =====================================================
-- MULTI-TENANT PHASE 1: SMART TRIGGER
-- Date: 2026-01-21
-- Purpose: 
--   1. Support dynamic Vakif Join via 'vakif_code' metadata.
--   2. Backward Compatibility: Default to 'KUZEY1453' if no code is provided.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  input_vakif_code TEXT;
  target_vakif_id UUID;
  default_role TEXT := 'sohbet_member';
BEGIN
  -- 1. Get Code from Metadata (sent by Client)
  input_vakif_code := NEW.raw_user_meta_data->>'vakif_code';

  -- 2. Fallback Logic (Backward Compatibility for Live App)
  -- If client sent nothing, assume they want the Master Tenant (Kuzey Şehir)
  IF input_vakif_code IS NULL OR input_vakif_code = '' THEN
      input_vakif_code := 'KUZEY1453';
  END IF;

  -- 3. Find Vakif ID
  SELECT id INTO target_vakif_id FROM public.vakiflar WHERE code = input_vakif_code LIMIT 1;

  -- 4. Safety Check: If code is invalid (and not fallback), what to do?
  -- For now, if code is invalid, we try KUZEY1453 explicitly to avoid crashing.
  IF target_vakif_id IS NULL THEN
      SELECT id INTO target_vakif_id FROM public.vakiflar WHERE code = 'KUZEY1453' LIMIT 1;
  END IF;

  -- 5. Create Profile
  INSERT INTO public.profiles (id, display_name, avatar_url, vakif_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    target_vakif_id,
    default_role
  );

  -- 6. Create Membership
  INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
  VALUES (
    NEW.id,
    target_vakif_id,
    default_role
  );

  RETURN NEW;
END;
$function$;
