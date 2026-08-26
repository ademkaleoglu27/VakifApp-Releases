-- =====================================================
-- DEBUG REGISTATION (GRID VIEW)
-- =====================================================
-- Bu sorgu sunucları direkt tablo olarak gosterir.
-- Messages sekmesine bakmaniza gerek kalmaz.

SELECT 
    au.email, 
    au.created_at,
    au.raw_user_meta_data->>'vakif_code' as GONDERILEN_KOD, -- Uygulamadan gelen
    v.code as ATANAN_VAKIF_KODU,                            -- Veritabanindaki
    v.name as ATANAN_VAKIF_ISMI,
    p.role as ROL
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.vakiflar v ON p.vakif_id = v.id
ORDER BY au.created_at DESC 
LIMIT 10;
