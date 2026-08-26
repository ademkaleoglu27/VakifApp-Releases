-- Lugat Dynamic Mappings Table
-- Allows remote alias management without app updates.

CREATE TABLE IF NOT EXISTS public.lugat_mappings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_word TEXT NOT NULL UNIQUE,
    target_word TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_lugat_mappings_source ON public.lugat_mappings (source_word);

-- RLS: Anyone can read, only admins can write.
ALTER TABLE public.lugat_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_lugat" ON public.lugat_mappings
    FOR SELECT USING (true);

CREATE POLICY "admin_write_lugat" ON public.lugat_mappings
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    );
