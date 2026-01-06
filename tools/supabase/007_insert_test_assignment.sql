-- 007_insert_test_assignment.sql

-- Bu script, oturum açmış olan (veya ilk bulduğu) kullanıcıya MANUEL olarak bir görev atar.
-- Nöbet listesinin boş gelme sorununu test etmek içindir.

do $$
declare
    v_pool_id uuid;
    v_user_id uuid;
begin
    -- 1. İlk 'Hizmet' veya herhangi bir havuzu bul
    select id into v_pool_id from public.rotation_pools limit 1;
    
    -- 2. Email adresine göre kullanıcı bul
    select id into v_user_id from auth.users where email = 'ademkaleoglu@outlook.com' limit 1;

    if v_pool_id is not null and v_user_id is not null then
        -- 3. Görevi Ekle (Bugünün tarihine)
        insert into public.duty_assignments (pool_id, user_id, date, status)
        values (v_pool_id, v_user_id, CURRENT_DATE, 'PENDING');
        
        raise notice 'Test görevi eklendi! Kullanıcı ID: %, Havuz ID: %', v_user_id, v_pool_id;
    else
        raise notice 'Havuz veya Kullanıcı bulunamadı. Lütfen önce 006_seed_duties.sql dosyasını çalıştırın.';
    end if;
end $$;
