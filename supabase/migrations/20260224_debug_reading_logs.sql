CREATE OR REPLACE FUNCTION public.debug_reading_logs()
RETURNS TABLE (
    id uuid, 
    user_id uuid, 
    vakif_id uuid, 
    pages_read integer, 
    created_at timestamptz, 
    date text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id, 
    user_id, 
    vakif_id, 
    pages_read, 
    created_at, 
    date::text 
  FROM public.reading_logs 
  ORDER BY created_at DESC 
  LIMIT 20;
$$;
