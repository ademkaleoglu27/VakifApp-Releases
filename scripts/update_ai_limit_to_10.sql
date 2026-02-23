-- AI Günlük Soru Limitini 10'a Çıkaran Güncelleme
-- Bu betiği Supabase SQL editöründe çalıştırınız.

CREATE OR REPLACE FUNCTION check_daily_limit(p_device_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    usage_count INT;
BEGIN
    SELECT COUNT(*) INTO usage_count
    FROM chat_logs
    WHERE device_id = p_device_id
    AND created_at > (now() - INTERVAL '24 hours');

    -- Limiti 7'den 10'a çıkarıyoruz.
    RETURN usage_count < 10;
END;
$$;
