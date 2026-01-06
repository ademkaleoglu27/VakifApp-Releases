
-- 006_seed_duties.sql

-- 1. Create Duty Types
insert into public.duty_types (name, description, default_points) values 
    ('Hizmet', 'Genel hizmet, çay, temizlik vb.', 10),
    ('Ders', 'Ders okuma görevi', 20)
on conflict do nothing;

-- 2. Create Rotation Pools
-- Get the ID of 'Hizmet' type
do $$
declare
    hizmet_type_id uuid;
    pool_id uuid;
    me_id uuid;
begin
    select id into hizmet_type_id from public.duty_types where name = 'Hizmet' limit 1;
    select id into me_id from auth.users limit 1; -- Just picks ONE user to start with (likely the dev)
    
    -- Create 'Haftalık Temizlik' Pool
    insert into public.rotation_pools (name, duty_type_id)
    values ('Haftalık Temizlik', hizmet_type_id)
    returning id into pool_id;

    -- Add existing users to this pool
    -- CAUTION: This adds ALL users to the cleaning pool for testing. 
    -- You can filter by role if needed (e.g. where role = 'sohbet_member')
    insert into public.rotation_pool_members (pool_id, user_id, sort_order)
    select pool_id, id, row_number() over (order by created_at)
    from public.profiles;

    -- Create 'Çay Nöbeti' Pool
    insert into public.rotation_pools (name, duty_type_id)
    values ('Çay Nöbeti', hizmet_type_id) -- e.g. every 3 days check? Or logic differs.
    returning id into pool_id;

     -- Add ALL users to tea pool
    insert into public.rotation_pool_members (pool_id, user_id, sort_order)
    select pool_id, id, row_number() over (order by created_at desc)
    from public.profiles;

end $$;
