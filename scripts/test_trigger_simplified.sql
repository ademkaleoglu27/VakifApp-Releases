-- =====================================================
-- TEST TRIGGER SIMPLIFIED (Hardcoded ID, No Membership)
-- Date: 2026-01-21
-- Description: 
-- We isolate the error by removing the Membership insert.
-- and using the KNOWN correct ID.
-- =====================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Insert Profile (Simplified)
  -- Uses the ID visible in your screenshot: 00000000-0000-0000-0000-000000000001
  INSERT INTO public.profiles (
    id, 
    display_name, 
    vakif_id, 
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    '00000000-0000-0000-0000-000000000001'::uuid, 
    'member'
  );

  -- 2. Membership Insert (TEMPORARILY COMMENTED OUT)
  -- If signup works after this, we know the error IS in this block.
  /*
  INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
  VALUES (
    NEW.id, 
    '00000000-0000-0000-0000-000000000001'::uuid, 
    'member'
  )
  ON CONFLICT DO NOTHING;
  */

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
