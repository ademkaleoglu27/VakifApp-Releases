-- =====================================================
-- GRANT PLATFORM ADMIN ROLE (By UUID)
-- =====================================================

DO $$
DECLARE
    -- User Provided UID
    v_user_id UUID := '087a04dc-a321-431a-904b-054fa8ecba26'::UUID;
BEGIN
    -- 1. Update Profile Role
    UPDATE public.profiles
    SET role = 'platform_admin'
    WHERE id = v_user_id;

    -- 2. Update Membership Role
    -- IMPORTANT: 'platform_admin' allows you to manage ALL vakifs from the Web Panel.
    -- Existing 'mesveret_admin' only allowed managing ONE vakif.
    UPDATE public.vakif_memberships
    SET role = 'platform_admin'
    WHERE user_id = v_user_id;

    RAISE NOTICE 'User % has been promoted to PLATFORM_ADMIN.', v_user_id;
END $$;
