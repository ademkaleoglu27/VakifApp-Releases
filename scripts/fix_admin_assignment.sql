-- =====================================================
-- FIX ADMIN ASSIGNMENT (Allow Pre-Registration Admin)
-- =====================================================

-- 1. Add contact_email to vakiflar table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vakiflar' AND column_name='contact_email') THEN
        ALTER TABLE public.vakiflar ADD COLUMN contact_email TEXT;
    END IF;
END $$;

-- 2. Update RPC to save the contact_email
CREATE OR REPLACE FUNCTION public.create_tenant_rpc(
    p_name TEXT,
    p_code TEXT,
    p_admin_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_new_vakif_id UUID;
    v_admin_user_id UUID;
    v_caller_role TEXT;
BEGIN
    -- Check role (Platform Admin only)
    SELECT role INTO v_caller_role
    FROM public.vakif_memberships
    WHERE user_id = auth.uid()
    ORDER BY CASE WHEN role = 'platform_admin' THEN 1 ELSE 2 END
    LIMIT 1;

    -- Validate Inputs
    IF p_name IS NULL OR p_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Name and Code are required.');
    END IF;

    -- Check Uniqueness
    IF EXISTS (SELECT 1 FROM public.vakiflar WHERE code = p_code) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This Vakif Code is already taken.');
    END IF;

    -- Create Vakif (With Contact Email)
    INSERT INTO public.vakiflar (name, code, contact_email)
    VALUES (p_name, p_code, p_admin_email)
    RETURNING id INTO v_new_vakif_id;

    -- Attempt to assign admin IMMEDIATELY (if user already exists)
    IF p_admin_email IS NOT NULL AND p_admin_email <> '' THEN
        SELECT id INTO v_admin_user_id FROM auth.users WHERE email = p_admin_email;

        IF v_admin_user_id IS NOT NULL THEN
             INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
             VALUES (v_admin_user_id, v_new_vakif_id, 'mesveret_admin')
             ON CONFLICT (user_id, vakif_id) DO UPDATE SET role = 'mesveret_admin';

             UPDATE public.profiles 
             SET vakif_id = v_new_vakif_id, role = 'mesveret_admin'
             WHERE id = v_admin_user_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Vakif created.', 'vakif_id', v_new_vakif_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;


-- 3. Update TRIGGER to check Contact Email for FUTURE registrations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_vakif_id UUID;
  v_default_role TEXT := 'sohbet_member';
  v_contact_email TEXT; -- Valid owner email
BEGIN
  -- A. Determine Vakif ID
  IF NEW.raw_user_meta_data->>'vakif_code' IS NOT NULL THEN
    
    -- Special case for Misafir
    IF UPPER(TRIM(NEW.raw_user_meta_data->>'vakif_code')) = 'MISAFIR' THEN
        v_default_role := 'guest';
    END IF;

    -- Find Vakif & Check Owner Email
    SELECT id, contact_email INTO v_vakif_id, v_contact_email
    FROM public.vakiflar 
    WHERE UPPER(code) = UPPER(TRIM(NEW.raw_user_meta_data->>'vakif_code'));
  END IF;

  -- B. Fallback Logic
  IF v_vakif_id IS NULL THEN
     SELECT id INTO v_vakif_id FROM public.vakiflar WHERE code = 'MISAFIR';
     v_default_role := 'guest';
  END IF;
  
  IF v_vakif_id IS NULL THEN
     SELECT id INTO v_vakif_id FROM public.vakiflar WHERE name = 'Kuzey Şehir Medresesi';
     v_default_role := 'guest';
  END IF;

  -- C. AUTO-PROMOTE ADMIN Check
  -- If the registering email matches the 'contact_email' of the vakif, make them ADMIN
  IF v_contact_email IS NOT NULL AND NEW.email = v_contact_email THEN
     v_default_role := 'mesveret_admin';
  END IF;

  -- D. Insert Records
  INSERT INTO public.profiles (id, display_name, vakif_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    v_vakif_id,
    v_default_role
  );

  INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
  VALUES (NEW.id, v_vakif_id, v_default_role);

  RETURN NEW;
END;
$function$;
