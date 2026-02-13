-- =====================================================
-- FIX MISAFIR ROLE ASSIGNMENT
-- =====================================================

-- 1. Update existing Misafir users to have 'guest' role
UPDATE public.profiles
SET role = 'guest'
FROM public.vakiflar v
WHERE public.profiles.vakif_id = v.id
AND v.code = 'MISAFIR'
AND public.profiles.role = 'sohbet_member';

UPDATE public.vakif_memberships
SET role = 'guest'
FROM public.vakiflar v
WHERE public.vakif_memberships.vakif_id = v.id
AND v.code = 'MISAFIR'
AND public.vakif_memberships.role = 'sohbet_member';


-- 2. Update the Trigger Function for future registrations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_vakif_id UUID;
  v_default_role TEXT := 'sohbet_member';
BEGIN
  -- 1. Determine Vakif ID based on Code
  IF NEW.raw_user_meta_data->>'vakif_code' IS NOT NULL THEN
    -- Special case for Misafir Code -> Set Role to 'guest'
    IF (NEW.raw_user_meta_data->>'vakif_code') = 'MISAFIR' THEN
        v_default_role := 'guest';
    END IF;

    SELECT id INTO v_vakif_id 
    FROM public.vakiflar 
    WHERE code = (NEW.raw_user_meta_data->>'vakif_code');
  END IF;

  -- Fallback logic (unchanged)
  IF v_vakif_id IS NULL THEN
     SELECT id INTO v_vakif_id FROM public.vakiflar WHERE name = 'Kuzey Şehir Medresesi';
  END IF;

  -- 2. Insert into profiles
  INSERT INTO public.profiles (id, display_name, vakif_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_vakif_id,
    v_default_role -- Uses 'guest' if code was MISAFIR
  );

  -- 3. Insert into vakif_memberships
  INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
  VALUES (NEW.id, v_vakif_id, v_default_role);

  RETURN NEW;
END;
$function$;
