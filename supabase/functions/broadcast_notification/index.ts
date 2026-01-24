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

        // 1. Authenticate Sender and Get Context (Vakif & Role)
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

        // Create Admin Client for fetching tokens (bypass RLS)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get Sender Profile for Vakif ID
        const { data: senderProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role, vakif_id')
            .eq('id', user.id)
            .single()

        if (profileError || !senderProfile) {
            return new Response(JSON.stringify({ success: false, message: 'Sender profile not found' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const allowedRoles = ['mesveret_admin', 'platform_admin', 'vakif_admin']
        if (!allowedRoles.includes(senderProfile.role)) {
            return new Response(JSON.stringify({ success: false, message: 'Forbidden: Insufficient privileges' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const senderVakifId = senderProfile.vakif_id
        if (!senderVakifId) {
            return new Response(JSON.stringify({ success: false, message: 'Sender does not belong to a vakif' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { title, body, target_role, data } = await req.json()

        // 2. Determine Target User IDs (Scoped by Vakif)
        let targetUserIds: string[] | null = null;

        if (target_role && target_role !== 'all') {
            const { data: profiles, error: targetError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('role', target_role)
                .eq('vakif_id', senderVakifId); // TENANT ISOLATION

            if (targetError) {
                console.error('Target fetch error:', targetError);
                return new Response(JSON.stringify({ success: false, message: 'Failed to fetch target profiles' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            targetUserIds = profiles.map(p => p.id);

            if (targetUserIds.length === 0) {
                return new Response(JSON.stringify({ success: true, count: 0, message: 'No users found for this role in your vakif' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        } else {
            // If target_role is 'all' or missing, fetch ALL users in vakif
            const { data: profiles, error: targetError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('vakif_id', senderVakifId); // TENANT ISOLATION

            if (targetError) {
                return new Response(JSON.stringify({ success: false, message: 'Failed to fetch all profiles' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
            targetUserIds = profiles.map(p => p.id);
        }

        // 3. Fetch Push Tokens
        // Need to filter tokens by user_id list which is already vakif-scoped
        if (!targetUserIds || targetUserIds.length === 0) {
            return new Response(JSON.stringify({ success: true, count: 0, message: 'No targets found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { data: tokens, error } = await supabaseAdmin
            .from('user_push_tokens')
            .select('token, user_id')
            .in('user_id', targetUserIds);

        if (error) {
            console.error('Token fetch error:', error);
            return new Response(JSON.stringify({ success: false, message: 'Error fetching tokens' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ success: true, count: 0, message: 'No devices found for targets' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const pushTokens = tokens.map(t => t.token)

        // 4. Send Notifications (Expo)
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

        // 5. Log to DB (Scoped by Vakif)
        const logInserts = tokens.map(t => ({
            user_id: t.user_id,
            title: title,
            body: body,
            data: data || {},
            vakif_id: senderVakifId // TENANT ISOLATION
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
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
