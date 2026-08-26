-- 20260216_weekly_reset_tues.sql
-- Change weekly reset to Tuesday 00:00 (Monday Night)

CREATE OR REPLACE FUNCTION public.get_reading_leaderboard(
    p_vakif_id UUID,
    p_range_type TEXT, -- 'week', 'month', 'year'
    p_limit INTEGER DEFAULT NULL,
    p_include_zero BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    initials TEXT,
    total_pages BIGINT,
    has_reading BOOLEAN,
    rank BIGINT,
    last_reading_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_timezone TEXT := 'Europe/Istanbul';
BEGIN
    -- SECURITY CHECK: Caller must be member of the requested vakif
    IF NOT EXISTS (
        SELECT 1 FROM public.vakif_memberships 
        WHERE user_id = auth.uid() AND vakif_id = p_vakif_id
    ) THEN
        RAISE EXCEPTION 'Not authorized to view stats for this vakif';
    END IF;

    -- 1. Calculate Start Date
    IF p_range_type = 'week' THEN
        -- Shift week start to TUESDAY (Monday + 1 day)
        -- Logic: (Current Time - 1 Day) -> Truncate to Week (Monday) -> Add 1 Day (Tuesday)
        v_start_date := (date_trunc('week', (now() AT TIME ZONE v_timezone) - interval '1 day') + interval '1 day')::date;
        
    ELSIF p_range_type = 'month' THEN
        -- 1st of current Month
        v_start_date := date_trunc('month', now() AT TIME ZONE v_timezone)::date;
    ELSIF p_range_type = 'year' THEN
        -- 1st of January
        v_start_date := date_trunc('year', now() AT TIME ZONE v_timezone)::date;
    ELSE
        -- Default to beginning of time
        v_start_date := '2000-01-01'::date;
    END IF;

    RETURN QUERY
    WITH raw_stats AS (
        SELECT
            vm.user_id,
            COALESCE(p.full_name, 'İsimsiz Üye') as display_name,
            p.avatar_url,
            COALESCE(SUM(rl.pages_read), 0) as total_pages,
            MAX(rl.created_at) as last_reading_date    
        FROM public.vakif_memberships vm
        LEFT JOIN public.profiles p ON vm.user_id = p.id
        LEFT JOIN public.reading_logs rl ON 
            rl.user_id = vm.user_id 
            AND rl.vakif_id = p_vakif_id
            AND rl.date >= v_start_date
        WHERE vm.vakif_id = p_vakif_id
        GROUP BY vm.user_id, p.full_name, p.avatar_url
    )
    SELECT
        rs.user_id,
        rs.display_name,
        rs.avatar_url,
        UPPER(
            SUBSTRING(rs.display_name FROM 1 FOR 1) || 
            COALESCE(SUBSTRING(split_part(rs.display_name, ' ', 2) FROM 1 FOR 1), '')
        ) as initials,
        rs.total_pages,
        (rs.total_pages > 0) as has_reading,
        RANK() OVER (ORDER BY rs.total_pages DESC, rs.display_name ASC) as rank,
        rs.last_reading_date
    FROM raw_stats rs
    WHERE (p_include_zero IS TRUE OR rs.total_pages > 0)
    ORDER BY rs.total_pages DESC, rs.display_name ASC
    LIMIT p_limit;
END;
$$;
