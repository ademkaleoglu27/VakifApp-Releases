-- =====================================================
-- FIX KUZEY SEHIR REGISTRATION & READING LOGS
-- Date: 2026-01-21
-- Description: 
-- 1. Dynamically finds 'Kuzey Şehir' Vakif ID (or creates if missing).
-- 2. Updates 'handle_new_user' to auto-assign new users to this Vakif (profiles + memberships).
-- 3. Fixes RLS policies for 'reading_logs' and 'vakif_memberships'.
-- =====================================================

BEGIN;

DO $$
DECLARE
    target_vakif_id UUID;
    v_count INT;
BEGIN
    -- 1. FIND OR CREATE 'Kuzey Şehir' VAKIF
    SELECT id INTO target_vakif_id FROM public.vakiflar WHERE name ILIKE '%Kuzey%';
    
    IF target_vakif_id IS NULL THEN
        RAISE NOTICE 'Kuzey Şehir vakif not found. Creating it...';
        INSERT INTO public.vakiflar (name, slug, is_active)
        VALUES ('Kuzey Şehir', 'kuzey-sehir', true)
        RETURNING id INTO target_vakif_id;
    ELSE
        RAISE NOTICE 'Found Kuzey Şehir Vakif ID: %', target_vakif_id;
    END IF;

    -- 2. UPDATE EXISTING PROFILES (Fix strays)
    UPDATE public.profiles 
    SET vakif_id = target_vakif_id 
    WHERE vakif_id IS NULL;

    -- 3. ENSURE MEMBERSSHIPS FOR EXISTING USERS
    -- If a profile has a vakif_id but no membership row, verify/fix it.
    INSERT INTO public.vakif_memberships (user_id, vakif_id, role, status)
    SELECT p.id, target_vakif_id, 'member', 'active'
    FROM public.profiles p
    WHERE p.vakif_id = target_vakif_id
      AND NOT EXISTS (
          SELECT 1 FROM public.vakif_memberships vm 
          WHERE vm.user_id = p.id AND vm.vakif_id = target_vakif_id
      )
    ON CONFLICT DO NOTHING;

    -- 4. UPDATE TRIGGER FUNCTION (The Core Logic)
    -- We need dynamic SQL to inject the variable, or just hardcode the logic in the function to lookup.
    -- Better to hardcode the lookup OR use the ID if we are sure it's stable.
    -- For this script, we will structure the function to look it up internally to be safe, 
    -- OR (better for performance) use the ID we found. 
    -- We'll use the specific ID we found in this transaction.
    
    EXECUTE format('
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $func$
        BEGIN
          -- 1. Insert Profile
          INSERT INTO public.profiles (id, full_name, avatar_url, vakif_id, role)
          VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>''full_name'', NEW.raw_user_meta_data->>''name'', NEW.email),
            NEW.raw_user_meta_data->>''avatar_url'',
            %L, -- Injected Target ID
            ''member''
          );

          -- 2. Insert Membership (CRITICAL for logic reliant on this table)
          INSERT INTO public.vakif_memberships (user_id, vakif_id, role, status)
          VALUES (
            NEW.id, 
            %L, -- Injected Target ID
            ''member'', 
            ''active''
          );

          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ', target_vakif_id, target_vakif_id);

END $$;

-- 5. FIX RLS POLICIES FOR READING LOGS
ALTER TABLE public.reading_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own readings" ON public.reading_logs;
CREATE POLICY "Users can insert their own readings"
ON public.reading_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND 
  EXISTS (
    SELECT 1 FROM public.vakif_memberships vm
    WHERE vm.user_id = auth.uid() 
      AND vm.status = 'active'
      -- implicit logic: they can insert if they are an active member involved in the log context
  )
);

DROP POLICY IF EXISTS "Users can view their own readings" ON public.reading_logs;
CREATE POLICY "Users can view their own readings"
ON public.reading_logs
FOR SELECT
TO authenticated
USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can update their own readings" ON public.reading_logs;
CREATE POLICY "Users can update their own readings"
ON public.reading_logs
FOR UPDATE
TO authenticated
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

-- 6. FIX RLS FOR VAKIF_MEMBERSHIPS (reading logs check needs access)
ALTER TABLE public.vakif_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.vakif_memberships;
CREATE POLICY "Users can view their own memberships"
ON public.vakif_memberships
FOR SELECT
TO authenticated
USING ( auth.uid() = user_id );

COMMIT;
