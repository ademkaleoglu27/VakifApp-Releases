-- Create user_push_tokens table
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    token TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_type TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Users can insert/update their own token
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.user_push_tokens;

CREATE POLICY "Users can manage their own tokens" ON public.user_push_tokens
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 2. Service Role (Edge Functions) can manage all tokens
-- (Service role bypasses RLS by default, but explicit policy is good practice if using restricted client)
-- No generic policy needed for service role as it's a superuser context usually.

-- 3. Admins can read tokens (Critical for sending notifications via client-side logic if valid, 
--    though strictly speaking only Edge Functions should access this for privacy. 
--    Let's NOT allow public read. Edge Function uses Service Role Key so it handles it.)

-- Grant access to authenticated users
GRANT ALL ON public.user_push_tokens TO authenticated;
GRANT ALL ON public.user_push_tokens TO service_role;
