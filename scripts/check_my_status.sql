-- =====================================================
-- CHECK MY STATUS
-- =====================================================
SELECT 
    p.id,
    p.display_name,
    p.role,
    p.vakif_id,
    v.name as vakif_name,
    vm.role as membership_role
FROM public.profiles p
LEFT JOIN public.vakiflar v ON p.vakif_id = v.id
LEFT JOIN public.vakif_memberships vm ON vm.user_id = p.id AND vm.vakif_id = p.vakif_id
WHERE p.id = '087a04dc-a321-431a-904b-054fa8ecba26'; 

-- Also list top 5 other users in this SAME vakif to see who they are
SELECT 
    p.display_name, 
    p.role, 
    v.name as vakif
FROM public.profiles p
LEFT JOIN public.vakiflar v ON p.vakif_id = v.id
WHERE p.vakif_id = (SELECT vakif_id FROM public.profiles WHERE id = '087a04dc-a321-431a-904b-054fa8ecba26')
AND p.id != '087a04dc-a321-431a-904b-054fa8ecba26'
LIMIT 5;
