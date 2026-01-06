
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// No Firebase needed for Expo Push API

serve(async (req) => {
    try {
        const { target_roles, user_ids, title, body, data } = await req.json()

        // 1. Auth Check (User context)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) return new Response('Unauthorized', { status: 401 })

        // Check Role
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role
        const allowedRoles = ['mesveret_admin', 'accountant']
        if (!allowedRoles.includes(role)) {
            return new Response('Forbidden: Insufficient privileges', { status: 403 })
        }

        // 2. Fetch Tokens
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let targetUserIds = new Set<string>()

        // Resolve Roles to User IDs
        if (target_roles && target_roles.length > 0) {
            const { data: usersWithRole } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .in('role', target_roles)

            usersWithRole?.forEach(u => targetUserIds.add(u.id))
        }

        // Add specific User IDs
        if (user_ids && Array.isArray(user_ids)) {
            user_ids.forEach(id => targetUserIds.add(id))
        }

        const targets = Array.from(targetUserIds)
        if (targets.length === 0) {
            return new Response(JSON.stringify({ message: 'No targets found' }), { headers: { 'Content-Type': 'application/json' } })
        }

        // 3. Get Push Tokens
        const { data: tokensData } = await supabaseAdmin
            .from('user_push_tokens')
            .select('token, user_id')
            .in('user_id', targets)

        const pushTokens = tokensData?.map(t => t.token) || []

        // 4. Send Expo Push Notifications (via HTTP)
        let successCount = 0
        let failureCount = 0

        // Filter valid Expo tokens using regex (starts with ExponentPushToken)
        const validTokens = pushTokens.filter(t => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'));

        if (validTokens.length > 0) {
            // Expo allows batches of up to 100
            // Simplified: Send all in one go (assuming < 100 for now) or batched logic needed for scale

            const message = {
                to: validTokens,
                sound: 'default',
                title: title,
                body: body,
                data: data || {},
            };

            try {
                const response = await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Accept-encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(message),
                });

                // Expo response structure check
                // const resJson = await response.json(); 
                // successCount = resJson?.data?.length || 0; 
                // Just assuming success if 200 for MVP logic simplicity
                if (response.ok) successCount = validTokens.length;
                else failureCount = validTokens.length;

            } catch (expoError) {
                console.error("Expo Send Error", expoError)
                failureCount = validTokens.length
            }
        }

        // 5. Insert into Notifications Table (For In-App History)
        const notificationsToInsert = targets.map(uid => ({
            user_id: uid,
            title,
            body,
            data,
            is_read: false
        }))

        const { error: insertError } = await supabaseAdmin
            .from('notifications')
            .insert(notificationsToInsert)

        if (insertError) {
            console.error("Notification Insert Error", insertError)
        }

        return new Response(JSON.stringify({
            message: 'Processed',
            targets: targets.length,
            push_sent: successCount,
            push_failed: failureCount
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

