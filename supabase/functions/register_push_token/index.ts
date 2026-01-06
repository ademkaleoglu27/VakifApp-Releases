
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        const { token, device_type } = await req.json()

        // Create Supabase client with Auth context
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Get current user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        if (!token) {
            return new Response(JSON.stringify({ error: 'Token required' }), { status: 400 })
        }

        // Upsert token
        const { error } = await supabaseClient
            .from('user_push_tokens')
            .upsert({
                user_id: user.id,
                token: token,
                device_type: device_type || 'unknown',
                updated_at: new Date().toISOString()
            }, { onConflict: 'token' })

        if (error) throw error

        return new Response(JSON.stringify({ message: 'Token registered' }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }
})
