-- =====================================================
-- Centralized Reading Stats Migration (PATCHED)
-- 1. Ensure Default Vakif + Table Structures
-- 2. Reading Logs RLS Policies
-- 3. Secure RPC: get_reading_leaderboard
-- =====================================================

-- 0. ENSURE DEFAULT VAKIF EXISTS (CRITICAL FK FIX)
-- =====================================================
INSERT INTO public.vakiflar (id, name, code, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'Default Vakif', 
    'default', 
    true
)
ON CONFLICT (id) DO NOTHING;


-- 1. ENSURE TABLES EXIST
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vakif_memberships (
    vakif_id UUID REFERENCES public.vakiflar(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- member, admin, owner
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (vakif_id, user_id)
);

-- Enable RLS for vakif_memberships
ALTER TABLE public.vakif_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vakif members can view membership list" ON public.vakif_memberships;
CREATE POLICY "Vakif members can view membership list" ON public.vakif_memberships
    FOR SELECT USING (
        vakif_id IN (
            SELECT vakif_id FROM public.vakif_memberships WHERE user_id = auth.uid()
        )
    );

-- Reading Logs (Ensure structure)
CREATE TABLE IF NOT EXISTS public.reading_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vakif_id UUID DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.vakiflar(id),
    user_id UUID REFERENCES auth.users(id),
    pages_read INTEGER NOT NULL CHECK (pages_read > 0),
    date DATE NOT NULL, -- The date the reading counts for (could be different from created_at)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- PRE-STORE PATCH: SINGLE TENANT DEFAULT & DATA INTEGRITY
-- Backfill NULL vakif_id to default
UPDATE public.reading_logs
SET vakif_id = '00000000-0000-0000-0000-000000000001'
WHERE vakif_id IS NULL;

-- Cleanup invalid user_id
DELETE FROM public.reading_logs
WHERE user_id IS NULL;

-- Enforce Constraints
ALTER TABLE public.reading_logs
ALTER COLUMN vakif_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.reading_logs
ALTER COLUMN vakif_id SET NOT NULL,
ALTER COLUMN user_id SET NOT NULL;

-- Enable RLS for reading_logs
ALTER TABLE public.reading_logs ENABLE ROW LEVEL SECURITY;

-- Reading Logs Policies
DROP POLICY IF EXISTS "Users can insert reading logs for their vakif" ON public.reading_logs;
CREATE POLICY "Users can insert reading logs for their vakif" ON public.reading_logs
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.vakif_memberships 
            WHERE user_id = auth.uid() AND vakif_id = reading_logs.vakif_id
        )
    );

DROP POLICY IF EXISTS "Users can view reading logs of their vakif" ON public.reading_logs;
CREATE POLICY "Users can view reading logs of their vakif" ON public.reading_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.vakif_memberships 
            WHERE user_id = auth.uid() AND vakif_id = reading_logs.vakif_id
        )
    );

-- 2. CREATE RPCS
-- =====================================================

-- RPC: get_reading_leaderboard
-- Returns the consolidated leaderboard based on standard timezone rules.
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

    -- 1. Calculate Start Date based on Range & Timezone
    IF p_range_type = 'week' THEN
        -- Last Monday aligned to Timezone
        v_start_date := date_trunc('week', now() AT TIME ZONE v_timezone)::date; 
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
            -- LEFT JOIN Fallback for name
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
        -- Generate Initials (First letter of first 2 words)
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
