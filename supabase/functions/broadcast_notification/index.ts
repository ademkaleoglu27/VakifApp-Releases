
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotification } from "../_shared/fcm.ts"

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

        // 1. Authenticate Sender (BMAD Role Fix)
        const authHeader = req.headers.get('Authorization');
        console.log(`[broadcast_notification] Auth header present: ${!!authHeader}, length: ${authHeader?.length || 0}`);

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            console.error(`[broadcast_notification] AUTH FAILED - userError: ${JSON.stringify(userError)}, user: ${!!user}`);
            return new Response(JSON.stringify({
                error: 'Unauthorized',
                details: userError?.message || 'No user found',
                authHeaderPresent: !!authHeader
            }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        console.log(`[broadcast_notification] AUTH OK - user: ${user.id}`);

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

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

        const userRole = senderProfile.role || 'guest'
        const allowedRoles = ['admin', 'platform_admin', 'vakif_admin', 'mesveret_admin', 'mesveret_member', 'council_member', 'accountant', 'moderator', 'sohbet_member'];

        console.log(`[Auth] Kullanıcı rolü: ${userRole}, İzin verilenler: ${allowedRoles}`);

        if (!allowedRoles.includes(userRole)) {
            console.error(`[Auth] REDDEDİLDİ - Rol: ${userRole}`);
            return new Response(JSON.stringify({
                error: 'Unauthorized',
                yourRole: userRole,
                requiredRoles: allowedRoles
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }
        console.log(`[Auth] ONAYLANDI - Rol: ${userRole}`);

        const senderVakifId = senderProfile.vakif_id
        if (!senderVakifId) {
            return new Response(JSON.stringify({ success: false, message: 'Sender does not belong to a vakif' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { title, body, target_role, data } = await req.json()

        // 2. Determine Target User IDs
        let targetUserIds: string[] = [];

        if (target_role && target_role !== 'all') {
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('role', target_role)
                .eq('vakif_id', senderVakifId);

            targetUserIds = profiles?.map(p => p.id) || [];
        } else {
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('vakif_id', senderVakifId);
            targetUserIds = profiles?.map(p => p.id) || [];
        }

        if (targetUserIds.length === 0) {
            return new Response(JSON.stringify({ success: true, count: 0, message: 'No targets found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 3. Fetch Push Tokens
        const { data: tokens, error: tokenError } = await supabaseAdmin
            .from('user_push_tokens')
            .select('token, user_id')
            .in('user_id', targetUserIds);

        if (tokenError || !tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ success: true, count: 0, message: 'No devices found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        console.log(`[broadcast_notification] Hedef kullanıcı: ${targetUserIds.length}, Token: ${tokens.length}`);
        console.log(`[broadcast_notification] Token'lar: ${tokens.map(t => t.token.substring(0, 20) + '...').join(', ')}`);

        // 4. Send Notifications
        const fcmConfigStr = Deno.env.get('FCM_SERVICE_ACCOUNT');
        const result = await sendPushNotification(
            tokens.map(t => t.token),
            title,
            body,
            data,
            fcmConfigStr
        );

        console.log(`[broadcast_notification] Push sonuç:`, JSON.stringify(result));

        if (result.expoFailed > 0 || result.fcmFailed > 0) {
            console.warn(`[broadcast_notification] Başarısız bildirimler:`, result.errors);
        }

        // 5. Database Log
        const logInserts = targetUserIds.map(uid => ({
            user_id: uid,
            title: title,
            body: body,
            data: data || {},
            vakif_id: senderVakifId
        }))

        if (logInserts.length > 0) {
            await supabaseAdmin.from('notifications').insert(logInserts);
        }

        return new Response(JSON.stringify({
            success: true,
            targets: targetUserIds.length,
            expo_sent: result.expoSent,
            expo_failed: result.expoFailed,
            fcm_sent: result.fcmSent,
            fcm_failed: result.fcmFailed,
            errors: result.errors
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Unexpected error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
