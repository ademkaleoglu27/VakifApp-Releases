-- 20260224_fix_leaderboard_contacts.sql
-- Merges 'reading_logs' (App Users) and 'contact_readings' (Manual entries) 
-- into the get_reading_leaderboard RPC.

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
    WITH all_members AS (
        -- 1. All Vakif App Members
        SELECT 
            vm.user_id as user_id,
            NULL::uuid as contact_id,
            p.full_name as raw_name,
            p.avatar_url
        FROM public.vakif_memberships vm
        JOIN public.profiles p ON vm.user_id = p.id
        WHERE vm.vakif_id = p_vakif_id

        UNION ALL
        
        -- 2. All Contacts for Vakif
        SELECT 
            c.user_id,
            c.id as contact_id,
            TRIM(COALESCE(c.name, '') || ' ' || COALESCE(c.surname, '')) as raw_name,
            NULL as avatar_url
        FROM public.contacts c
        WHERE c.vakif_id = p_vakif_id
    ),
    grouped_identities AS (
        -- Merge identities that have both a user_id (profil) and contact_id (contact)
        SELECT 
            COALESCE(m.user_id, m.contact_id) as identity_id,
            MAX(m.user_id) as user_id,
            MAX(m.contact_id) as contact_id,
            MAX(m.avatar_url) as avatar_url,
            MAX(COALESCE(m.raw_name, 'İsimsiz Üye')) as display_name
        FROM all_members m
        GROUP BY COALESCE(m.user_id, m.contact_id)
    ),
    all_readings AS (
        -- 1. App User Readings
        SELECT 
            rl.user_id,
            NULL::UUID as contact_id,
            rl.pages_read,
            rl.date,
            rl.created_at
        FROM public.reading_logs rl
        WHERE rl.vakif_id = p_vakif_id

        UNION ALL

        -- 2. Manual Contact Readings
        SELECT 
            c.user_id,   -- Inherit user_id if linked
            cr.contact_id,
            cr.pages_read,
            cr.date,
            cr.created_at
        FROM public.contact_readings cr
        JOIN public.contacts c ON cr.contact_id = c.id
        WHERE cr.vakif_id = p_vakif_id 
           OR (cr.vakif_id IS NULL AND c.vakif_id = p_vakif_id)
    ),
    raw_stats AS (
        -- Join Identities with their Readings
        SELECT 
            gi.identity_id,
            gi.display_name,
            gi.avatar_url,
            COALESCE(SUM(CASE WHEN ar.date >= v_start_date THEN ar.pages_read ELSE 0 END), 0) as total_pages,
            MAX(ar.created_at) as last_reading_date    
        FROM grouped_identities gi
        LEFT JOIN all_readings ar 
            ON (ar.user_id = gi.user_id AND ar.user_id IS NOT NULL)
            OR (ar.contact_id = gi.contact_id AND ar.contact_id IS NOT NULL)
        GROUP BY gi.identity_id, gi.display_name, gi.avatar_url
    )
    SELECT
        rs.identity_id as user_id, -- Keep output column name API compliant
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
