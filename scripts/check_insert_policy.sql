-- =====================================================
-- CHECK INSERT POLICY
-- =====================================================

-- Get policies only for INSERT on reading_logs
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'reading_logs'
AND cmd = 'INSERT';

-- Also check if there's a policy that might BLOCK it (though RLS is usually permissive if one exists)
-- We need to ensure there is AT LEAST ONE policy allowing INSERT.
