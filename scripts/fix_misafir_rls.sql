-- =====================================================
-- FIX MISAFIR RLS ISOLATION
-- =====================================================

DROP POLICY IF EXISTS "Users can view reading logs of their vakif" ON public.reading_logs;

CREATE POLICY "Users can view reading logs of their vakif" ON public.reading_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 
    FROM public.vakif_memberships vm
    JOIN public.vakiflar v ON vm.vakif_id = v.id
    WHERE vm.user_id = auth.uid()       -- I am a member
    AND vm.vakif_id = reading_logs.vakif_id -- Of this log's vakif
    AND (
        v.code <> 'MISAFIR'             -- If NOT Misafir, I see all
        OR
        reading_logs.user_id = auth.uid() -- If Misafir, I see ONLY mine
    )
  )
);
