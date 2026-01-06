import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { title, body, target_role, data } = await req.json()

        // Create Admin Client for fetching tokens (bypass RLS)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Determine Target User IDs
        let targetUserIds: string[] | null = null;

        if (target_role && target_role !== 'all') {
            const { data: profiles, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('role', target_role);

            if (profileError) {
                console.error('Profile fetch error:', profileError);
                return new Response(JSON.stringify({ success: false, message: 'Failed to fetch target profiles' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            targetUserIds = profiles.map(p => p.id);

            if (targetUserIds.length === 0) {
                // Graceful exit if no users found in that role
                return new Response(JSON.stringify({ success: true, count: 0, message: 'No users found for this role' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // 2. Fetch Push Tokens
        let query = supabaseAdmin.from('user_push_tokens').select('token, user_id');

        if (targetUserIds) {
            query = query.in('user_id', targetUserIds);
        }

        const { data: tokens, error } = await query

        if (error) {
            console.error('Token fetch error:', error);
            return new Response(JSON.stringify({ success: false, message: 'Error fetching tokens' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ success: true, count: 0, message: 'No devices found for target' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const pushTokens = tokens.map(t => t.token)

        // 3. Send Notifications (Expo)
        const message = {
            to: pushTokens,
            sound: 'default',
            title: title,
            body: body,
            data: data || {},
        };

        const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        // Log response from Expo for debugging
        const expoData = await expoRes.json();
        console.log('Expo Response:', expoData);

        // 4. Log to DB
        const logInserts = tokens.map(t => ({
            user_id: t.user_id,
            title: title,
            body: body,
            data: data || {}
        }))

        if (logInserts.length > 0) {
            const { error: logError } = await supabaseAdmin.from('notifications').insert(logInserts);
            if (logError) console.error('Log insert error:', logError);
        }

        return new Response(JSON.stringify({ success: true, count: tokens.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Unexpected error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 200, // Return 200 even on error to avoid client throw, let client handle 'success: false'
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
