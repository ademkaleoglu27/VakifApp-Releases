
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// No Firebase needed for Expo

serve(async (req) => {
    try {
        const { assignment_id, action } = await req.json() // action: 'ACCEPT' | 'PASS'

        if (!['ACCEPT', 'PASS'].includes(action)) {
            return new Response('Invalid action', { status: 400 })
        }

        // 1. Auth & Service Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) return new Response('Unauthorized', { status: 401 })

        // 2. Fetch Assignment
        const { data: assignment, error: assignError } = await supabaseAdmin
            .from('duty_assignments')
            .select('*, rotation_pools(*)')
            .eq('id', assignment_id)
            .single()

        if (assignError || !assignment) return new Response('Assignment not found', { status: 404 })

        // Check ownership
        let isOwner = assignment.user_id === user.id
        if (!isOwner) {
            // Check admin
            const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
            if (profile?.role !== 'mesveret_admin') return new Response('Forbidden', { status: 403 })
        }

        // 3. Handle Action
        if (action === 'ACCEPT') {
            const { error } = await supabaseAdmin
                .from('duty_assignments')
                .update({ status: 'CONFIRMED' })
                .eq('id', assignment_id)

            if (error) throw error
            return new Response(JSON.stringify({ message: 'Duty Accepted' }), { headers: { 'Content-Type': 'application/json' } })
        }

        if (action === 'PASS') {
            // A. Mark current declined
            await supabaseAdmin
                .from('duty_assignments')
                .update({ status: 'DECLINED' })
                .eq('id', assignment_id)

            // B. Find next member in pool
            const { data: members } = await supabaseAdmin
                .from('rotation_pool_members')
                .select('user_id, sort_order')
                .eq('pool_id', assignment.pool_id)
                .order('sort_order', { ascending: true })
                .order('last_assigned_at', { ascending: true })

            if (!members || members.length === 0) {
                return new Response(JSON.stringify({ message: 'Duty Passed (No other members to assign)' }), { headers: { 'Content-Type': 'application/json' } })
            }

            const currentIndex = members.findIndex(m => m.user_id === assignment.user_id)
            let nextIndex = (currentIndex + 1) % members.length

            if (members.length === 1) {
                return new Response(JSON.stringify({ message: 'Duty Passed (Only 1 member in pool)' }), { headers: { 'Content-Type': 'application/json' } })
            }

            const nextMember = members[nextIndex]

            // C. Create New Assignment
            const { data: newAssignment } = await supabaseAdmin
                .from('duty_assignments')
                .insert({
                    pool_id: assignment.pool_id,
                    user_id: nextMember.user_id,
                    date: assignment.date,
                    status: 'PENDING'
                })
                .select()
                .single()

            // D. Send Push to New Assignee (Expo)
            const { data: tokens } = await supabaseAdmin.from('user_push_tokens').select('token').eq('user_id', nextMember.user_id)
            const pushTokens = tokens?.map(t => t.token) || []
            const validTokens = pushTokens.filter(t => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'));

            if (validTokens.length > 0) {
                try {
                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Accept-encoding': 'gzip, deflate',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            to: validTokens,
                            sound: 'default',
                            title: 'Görev Devredildi',
                            body: `${assignment.rotation_pools.name} görevi size devredildi.`,
                            data: { type: 'duty_assigned', assignment_id: newAssignment?.id }
                        }),
                    });
                } catch (e) {
                    console.error("Expo Send Error", e)
                }
            }

            // E. In-App Notification
            await supabaseAdmin.from('notifications').insert({
                user_id: nextMember.user_id,
                title: 'Yeni Görev Ataması',
                body: 'Bir görev pas geçildi ve size atandı.',
                data: { type: 'duty_assigned', assignment_id: newAssignment?.id }
            })

            return new Response(JSON.stringify({ message: 'Duty Passed & Reassigned' }), { headers: { 'Content-Type': 'application/json' } })
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } })
    }
})

