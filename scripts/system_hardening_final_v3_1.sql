-- =====================================================
-- SYSTEM HARDENING FINAL V3.1 (Production Ready)
-- =====================================================
-- What changed (V3.1):
-- 1. create_tenant_rpc: enforce platform_admin check is now deterministic (EXISTS check).
-- 2. handle_new_user: profile UPSERT preserves existing role if present (COALESCE).

-- 1. CLEANUP DUPLICATES (Robust CTID Method)
-- Keep only the latest membership for any (user, vakif) pair
DELETE FROM public.vakif_memberships
WHERE ctid NOT IN (
    SELECT ctid
    FROM (
        SELECT ctid,
               ROW_NUMBER() OVER (partition BY user_id, vakif_id ORDER BY created_at DESC) as rnum
        FROM public.vakif_memberships
    ) t
    WHERE t.rnum = 1
);

-- 2. ADD UNIQUE CONSTRAINT
-- Ensures DB-level integrity against duplicates
ALTER TABLE public.vakif_memberships 
DROP CONSTRAINT IF EXISTS unique_membership;

ALTER TABLE public.vakif_memberships
ADD CONSTRAINT unique_membership UNIQUE (user_id, vakif_id);


-- 3. SECURE & ROBUST TRIGGER (handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_vakif_id UUID;
  v_default_role TEXT := 'sohbet_member';
  v_contact_email TEXT;
  v_input_code TEXT;
  v_display_name TEXT;
BEGIN
  -- 1. Input Normalization
  v_input_code := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'vakif_code', '')));
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email);

  -- 2. Determine Vakif ID
  IF v_input_code <> '' THEN
      -- Case A: Bireysel Kayit (Misafir) - Improved with TRIM
      IF v_input_code = 'MISAFIR' THEN
         v_default_role := 'guest';
         -- Case-insensitive lookup for Misafir tenant
         SELECT id INTO v_vakif_id FROM public.vakiflar WHERE UPPER(TRIM(code)) = 'MISAFIR';
      
      -- Case B: Code Based Join - Improved with TRIM
      ELSE
         -- Normalize lookup against DB
         SELECT id, contact_email INTO v_vakif_id, v_contact_email
         FROM public.vakiflar 
         WHERE UPPER(TRIM(code)) = v_input_code; 
         
         -- STRICT MODE: If code valid string but mismatch -> v_vakif_id stays NULL (No Membership)
      END IF;
  END IF;

  -- 3. Admin Promotion Check (Normalize Email)
  IF v_vakif_id IS NOT NULL AND v_contact_email IS NOT NULL THEN
     IF LOWER(TRIM(NEW.email)) = LOWER(TRIM(v_contact_email)) THEN
        v_default_role := 'mesveret_admin';
     END IF;
  END IF;

  -- 4. Profile Upsert (Idempotent & Preserves Role)
  INSERT INTO public.profiles (id, display_name, vakif_id, role)
  VALUES (
    NEW.id,
    v_display_name,
    v_vakif_id, 
    v_default_role
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    -- PROTECTED: Keep existing role if set, otherwise use new default
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    -- PROTECTED: Never overwrite an existing vakif connection
    vakif_id = COALESCE(public.profiles.vakif_id, EXCLUDED.vakif_id);

  -- 5. Membership Insert
  IF v_vakif_id IS NOT NULL THEN
      INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
      VALUES (NEW.id, v_vakif_id, v_default_role)
      ON CONFLICT (user_id, vakif_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;


-- 4. SECURE RPC (create_tenant_rpc)
CREATE OR REPLACE FUNCTION public.create_tenant_rpc(
    p_name TEXT,
    p_code TEXT,
    p_admin_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
    v_new_vakif_id UUID;
    v_admin_user_id UUID;
    v_clean_name TEXT;
    v_clean_code TEXT;
    v_clean_email TEXT;
BEGIN
    -- Input Hygiene
    v_clean_name := TRIM(p_name);
    v_clean_code := UPPER(TRIM(p_code));
    v_clean_email := NULLIF(LOWER(TRIM(p_admin_email)), '');

    -- DETERMINISTIC CHECK (V3.1 Change)
    IF NOT EXISTS (
      SELECT 1
      FROM public.vakif_memberships
      WHERE user_id = auth.uid()
        AND role = 'platform_admin'
    ) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Only Platform Admins can create tenants.');
    END IF;

    -- Validate Inputs
    IF v_clean_name IS NULL OR v_clean_code IS NULL OR v_clean_name = '' OR v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Name and Code are required.');
    END IF;

    -- Check Uniqueness (Case-Insensitive Trimmed)
    IF EXISTS (SELECT 1 FROM public.vakiflar WHERE UPPER(TRIM(code)) = v_clean_code) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This Vakif Code is already taken.');
    END IF;

    -- Create Vakif
    INSERT INTO public.vakiflar (name, code, contact_email)
    VALUES (v_clean_name, v_clean_code, v_clean_email)
    RETURNING id INTO v_new_vakif_id;

    -- Assign Admin (If User Exists)
    IF v_clean_email IS NOT NULL THEN
        -- Secure Lookup
        SELECT id INTO v_admin_user_id FROM auth.users WHERE LOWER(TRIM(email)) = v_clean_email;

        IF v_admin_user_id IS NOT NULL THEN
             -- Insert Membership (Upsert Role)
             INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
             VALUES (v_admin_user_id, v_new_vakif_id, 'mesveret_admin')
             ON CONFLICT (user_id, vakif_id) DO UPDATE SET role = 'mesveret_admin';

             -- Update Profile (Sync)
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
