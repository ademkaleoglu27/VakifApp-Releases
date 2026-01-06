-- 010_daily_cron.sql

-- Bu script, Nöbet Sisteminin her sabah çalışmasını sağlar.
-- Her sabah 09:00'da çalışır ve "7 gün sonraki" nöbetleri kontrol eder.
-- Eğer 7 gün sonrası (örn. Haftaya Pazartesi) bir nöbet günü ise, görev atar ve bildirim gönderir.

-- Önce eski cron varsa temizle
select cron.unschedule('daily-duty-check');

-- Yeni Cron Oluştur (Her gün saat 09:00'da)
select cron.schedule(
    'daily-duty-check', -- Job Name
    '0 9 * * *',        -- Schedule (09:00 AM Every Day)
    $$
    select net.http_post(
        url:='https://kyyvkmvdqvjpjfqfvnro.supabase.co/functions/v1/duty_cron',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
        body:='{"type": "generate"}'::jsonb
    ) as request_id;
    $$
);

-- Not: SERVICE_ROLE_KEY yerini kendi Supabase Service Role Key'in ile değiştirmen gerekecek!
-- Ya da bu dosyayı çalıştırmadan önce editörde düzenle.
