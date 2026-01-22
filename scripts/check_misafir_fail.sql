-- =====================================================
-- CHECK MISAFIR FAIL
-- =====================================================

-- See the raw metadata sent by the client for the latest user
SELECT 
  id, 
  raw_user_meta_data, 
  email, 
  created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1;

-- See where they were assigned in profiles
SELECT 
    p.display_name, 
    v.name as vakif_name, 
    v.code as vakif_code 
FROM public.profiles p
JOIN public.vakiflar v ON p.vakif_id = v.id
ORDER BY p.created_at DESC 
LIMIT 1;
