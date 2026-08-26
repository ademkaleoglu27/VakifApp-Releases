-- =====================================================
-- DISABLE TRIGGER TEMPORARILY
-- Run this to verify if the Trigger is causing the blockage.
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- After running this, try to register in the app.
-- If it works, we confirm the Trigger was the problem.
-- We will re-enable a fixed trigger afterwards.
