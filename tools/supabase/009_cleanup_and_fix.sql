-- 009_cleanup_and_fix.sql

-- 1. Önce bu havuzlara ait atamaları sil (Constraint hatasını önlemek için)
delete from public.duty_assignments
where pool_id in (select id from public.rotation_pools where name in ('Haftalık Temizlik', 'Çay Nöbeti'));

-- 2. Eski/Fazlalık Havuzları Sil
delete from public.rotation_pools 
where name in ('Haftalık Temizlik', 'Çay Nöbeti');

-- 2. İlişki Hatasını Düzelt (Join Fix)
-- "Üye listesi çekilemedi" hatasının sebebi: 
-- Tablo doğrudan auth.users'a bağlı olduğu için 'profiles' tablosuyla otomatik birleşemiyordu.
-- Bağlantıyı 'public.profiles' tablosuna yönlendiriyoruz.

alter table public.rotation_pool_members 
drop constraint if exists rotation_pool_members_user_id_fkey;

alter table public.rotation_pool_members
add constraint rotation_pool_members_user_id_fkey
foreign key (user_id) references public.profiles(id)
on delete cascade;

-- Bu işlemden sonra uygulama tarafındaki .select('..., profiles:user_id(...)') sorgusu çalışacaktır.
