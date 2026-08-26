
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { sendPushNotification } from "../_shared/fcm.ts"

serve(async (req) => {
    try {
        const { target_roles, user_ids, title, body, data } = await req.json()
        console.log(`Notification trigger: title="${title}", body="${body}", targets=${user_ids?.length || 0} users, roles=${target_roles?.length || 0}`);

        // 1. Auth Check (BMAD Role Fix)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) return new Response('Unauthorized', { status: 401 })

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role, vakif_id')
            .eq('id', user.id)
            .single()

        const userRole = profile?.role || 'guest'
        const senderVakifId = profile?.vakif_id
        const allowedRoles = ['admin', 'platform_admin', 'vakif_admin', 'mesveret_admin', 'mesveret_member', 'council_member', 'accountant', 'moderator', 'sohbet_member', 'guest']

        console.log(`[Auth] Kullanıcı rolü: ${userRole}, İzin verilenler: ${allowedRoles}`);

        if (!allowedRoles.includes(userRole)) {
            console.error(`[Auth] REDDEDİLDİ - Rol: ${userRole}`);
            return new Response(JSON.stringify({
                error: 'Unauthorized',
                yourRole: userRole,
                requiredRoles: allowedRoles
            }), { status: 403, headers: { "Content-Type": "application/json" } })
        }
        console.log(`[Auth] ONAYLANDI - Rol: ${userRole}`);

        if (!senderVakifId) {
            return new Response('Forbidden: No vakif context', { status: 403 })
        }

        // 2. Fetch Tokens
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let targetUserIds = new Set<string>()

        if (target_roles && target_roles.length > 0) {
            const { data: usersWithRole } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .in('role', target_roles)
                .eq('vakif_id', senderVakifId)

            usersWithRole?.forEach(u => targetUserIds.add(u.id))
        }

        if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
            const { data: validUsers } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .in('id', user_ids)
                .eq('vakif_id', senderVakifId)

            validUsers?.forEach(u => targetUserIds.add(u.id))
        }

        const targets = Array.from(targetUserIds)
        if (targets.length === 0) {
            return new Response(JSON.stringify({ message: 'No targets found' }), { headers: { 'Content-Type': 'application/json' } })
        }

        const { data: tokensData } = await supabaseAdmin
            .from('user_push_tokens')
            .select('token, user_id')
            .in('user_id', targets)

        const pushTokens = tokensData?.map(t => t.token) || []

        // 3. Send Notifications
        const fcmConfigStr = Deno.env.get('FCM_SERVICE_ACCOUNT');
        const result = await sendPushNotification(
            pushTokens,
            title,
            body,
            data,
            fcmConfigStr
        );

        console.log(`[send_notification] Push sonuç:`, result);

        if (result.expoFailed > 0 || result.fcmFailed > 0) {
            console.warn(`[send_notification] Başarısız bildirimler:`, result.errors);
        }

        // 4. Log to DB
        const notificationsToInsert = targets.map(uid => ({
            user_id: uid,
            title,
            body,
            data: data || {},
            is_read: false,
            vakif_id: senderVakifId
        }))

        if (notificationsToInsert.length > 0) {
            await supabaseAdmin.from('notifications').insert(notificationsToInsert)
        }

        return new Response(JSON.stringify({
            success: true,
            targets: targets.length,
            expo_sent: result.expoSent,
            expo_failed: result.expoFailed,
            fcm_sent: result.fcmSent,
            fcm_failed: result.fcmFailed,
            errors: result.errors
        }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }
})
