-- =====================================================
-- MULTI-TENANT PHASE 1.5: CREATE GUEST TENANT
-- Date: 2026-01-21
-- Purpose: Create "Misafir" vakif for individual users.
-- =====================================================

INSERT INTO public.vakiflar (name, code, is_active)
VALUES 
    ('Misafir', 'MISAFIR', true)
ON CONFLICT (code) DO UPDATE 
SET name = 'Misafir'; -- Ensure name is correct if it exists

-- Optional: You might want to ensure RLS allows 'Misafir' to work correctly.
-- Since we used standard RLS "View own vakif", this works automatically.
-- Users in 'Misafir' will only see other 'Misafir' users (or none, if we prefer).

-- NOTE: The 'handle_new_user' trigger will automatically assign this vakif
-- if the client sends vakif_code = 'MISAFIR'.
