-- =====================================================
-- HARDEN MULTI-TENANT SETUP (Prevent Pollution)
-- =====================================================

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
    -- Case-insensitive check
    IF UPPER(TRIM(NEW.raw_user_meta_data->>'vakif_code')) = 'MISAFIR' THEN
        v_default_role := 'guest';
    END IF;

    SELECT id INTO v_vakif_id 
    FROM public.vakiflar 
    WHERE UPPER(code) = UPPER(TRIM(NEW.raw_user_meta_data->>'vakif_code'));
  END IF;

  -- 2. Fallback Logic (CHANGED: Default to MISAFIR to prevent pollution in Kuzey)
  IF v_vakif_id IS NULL THEN
     SELECT id INTO v_vakif_id FROM public.vakiflar WHERE code = 'MISAFIR';
     v_default_role := 'guest'; -- Force guest role for fallback users
  END IF;

  -- Safety Check: If Misafir tenant is missing for some reason, THEN fallback to Kuzey (Last Resort)
  IF v_vakif_id IS NULL THEN
     SELECT id INTO v_vakif_id FROM public.vakiflar WHERE name = 'Kuzey Şehir Medresesi';
     v_default_role := 'guest'; -- Still guest
  END IF;

  -- 3. Insert into profiles
  INSERT INTO public.profiles (id, display_name, vakif_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    v_vakif_id,
    v_default_role
  );

  -- 4. Insert into vakif_memberships
  INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
  VALUES (NEW.id, v_vakif_id, v_default_role);

  RETURN NEW;
END;
$function$;
