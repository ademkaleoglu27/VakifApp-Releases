-- 008_seed_specific_pools.sql

do $$
declare
    hizmet_type_id uuid;
    ders_type_id uuid;
begin
    -- 1. Get or Create Types
    select id into hizmet_type_id from public.duty_types where name = 'Hizmet' limit 1;
    select id into ders_type_id from public.duty_types where name = 'Ders' limit 1;

    -- Ensure types exist if not
    if hizmet_type_id is null then
        insert into public.duty_types (name, description) values ('Hizmet', 'Genel hizmetler') returning id into hizmet_type_id;
    end if;
    if ders_type_id is null then
        insert into public.duty_types (name, description) values ('Ders', 'Ders ve sohbet görevleri') returning id into ders_type_id;
    end if;

    -- 2. Create Pools
    
    -- A. Pazartesi Sohbeti (Haftalık, Pazartesi)
    insert into public.rotation_pools (name, duty_type_id, cron_schedule)
    values (
        'Pazartesi Sohbeti', 
        ders_type_id,
        '0 20 * * 1' -- Every Monday at 20:00 (Example cron)
    );

    -- B. Çay & Temizlik (Haftada 2 gün: Pzt ve Perşembe)
    -- Not: Complex cron (Mon,Thu) supported by pg_cron '0 18 * * 1,4'
    insert into public.rotation_pools (name, duty_type_id, cron_schedule)
    values (
        'Çay & Temizlik',
        hizmet_type_id,
        '0 18 * * 1,4' 
    );

    -- C. Cumartesi Çorbası (Haftalık, Cumartesi)
    insert into public.rotation_pools (name, duty_type_id, cron_schedule)
    values (
        'Cumartesi Çorbası',
        hizmet_type_id,
        '0 7 * * 6'
    );

end $$;
