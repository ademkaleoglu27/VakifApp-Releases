-- =====================================================
-- Meşveret Decisions Enhancement Migration
-- 1. Creates decision_items table for structured data
-- 2. Sets up decision-attachments storage bucket
-- =====================================================

-- 1. Create decision_items table
CREATE TABLE IF NOT EXISTS public.decision_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Multi-tenant isolation field
    vakif_id UUID REFERENCES public.vakiflar(id)
);

-- Enable RLS
ALTER TABLE public.decision_items ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for decision_items
-- Tenant Isolation: Valid users can see items belonging to their vakif (or null vakif)
DROP POLICY IF EXISTS "Decision Items tenant isolation" ON public.decision_items;

CREATE POLICY "Decision Items tenant isolation" ON public.decision_items
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);


-- 3. Storage Bucket Setup (If permission allows via SQL, otherwise requires Dashboard)
-- Attempt to create bucket 'decision-attachments'
INSERT INTO storage.buckets (id, name, public)
VALUES ('decision-attachments', 'decision-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow Authenticated uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'decision-attachments');

-- Allow Public/Authenticated reads (since we made bucket public)
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'decision-attachments');

-- Allow Owners to Delete (optional)
CREATE POLICY "Allow owners to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'decision-attachments' AND owner = auth.uid());
