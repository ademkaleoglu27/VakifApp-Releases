-- =====================================================
-- FIX REGISTRATION FINAL (FAILSAFE & FIXED COLUMNS)
-- Date: 2026-01-21
-- Description: 
-- 1. Ensures 'Kuzey Şehir' exists.
-- 2. Ensures 'profiles' has necessary columns.
-- 3. Updates 'handle_new_user' trigger (removed non-existent 'status' column).
-- =====================================================

BEGIN;

-- 1. Ensure Columns Exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vakif_id uuid REFERENCES public.vakiflar(id);

-- 2. Ensure Vakif Exists
DO $$
DECLARE
    target_vakif_id UUID;
BEGIN
    -- FIND VAKIF
    SELECT id INTO target_vakif_id FROM public.vakiflar WHERE name ILIKE '%Kuzey%' LIMIT 1;
    
    IF target_vakif_id IS NULL THEN
        INSERT INTO public.vakiflar (name, slug, is_active)
        VALUES ('Kuzey Şehir', 'kuzey-sehir', true)
        RETURNING id INTO target_vakif_id;
    END IF;

    -- REPLACE TRIGGER FUNCTION
    -- UPDATE: Removed 'status' from vakif_memberships INSERT
    
    EXECUTE format('
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $func$
        BEGIN
            -- 1. Insert Profile
            INSERT INTO public.profiles (
                id, 
                display_name, 
                avatar_url, 
                vakif_id, 
                role
            )
            VALUES (
                NEW.id,
                COALESCE(
                    NEW.raw_user_meta_data->>''full_name'', 
                    NEW.raw_user_meta_data->>''display_name'',
                    NEW.raw_user_meta_data->>''name'', 
                    NEW.email,
                    ''Yeni Üye''
                ),
                NEW.raw_user_meta_data->>''avatar_url'',
                %L, -- Vakif ID
                ''member''
            );
            
            -- 2. Insert Membership (No status column)
            INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
            VALUES (
                NEW.id,
                %L,
                ''member''
            )
            ON CONFLICT DO NOTHING;

            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ', target_vakif_id, target_vakif_id);
    
END $$;

COMMIT;
