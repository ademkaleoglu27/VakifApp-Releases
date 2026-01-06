
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// No Firebase needed

serve(async (req) => {
    try {
        const { type } = await req.json() // type: 'generate' | 'expire'

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const sendExpoPush = async (tokens: string[], title: string, body: string, data?: any) => {
            const validTokens = tokens.filter(t => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'));
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
                            title: title,
                            body: body,
                            data: data || {},
                        }),
                    });
                } catch (e) {
                    console.error("Expo Send Error", e)
                }
            }
        }

        // 1. Weekly Generation & Reminders
        if (type === 'generate') {
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // A. REMINDER LOGIC (Check for Tomorrow's Duties)
            // ------------------------------------------------------------------
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            console.log(`Checking reminders for: ${tomorrowStr}`);

            const { data: reminders } = await supabaseAdmin
                .from('duty_assignments')
                .select(`
                    id,
                    user_id,
                    pool_id,
                    rotation_pools (name)
                `)
                .eq('date', tomorrowStr)
                .in('status', ['PENDING', 'CONFIRMED']); // Remind even if pending

            if (reminders && reminders.length > 0) {
                for (const duty of reminders) {
                    // Send Reminder Push
                    const { data: tokens } = await supabaseAdmin.from('user_push_tokens').select('token').eq('user_id', duty.user_id)
                    const pushTokens = tokens?.map(t => t.token) || []

                    if (pushTokens.length > 0) {
                        const poolName = (duty.rotation_pools as any)?.name || 'Görev';
                        await sendExpoPush(pushTokens, 'Hatırlatma', `Yarın ${poolName} nöbetiniz var!`);

                        // Log to DB
                        await supabaseAdmin.from('notifications').insert({
                            user_id: duty.user_id,
                            title: 'Nöbet Hatırlatması',
                            body: `Yarın ${poolName} sırası sizde.`,
                            data: { type: 'duty_reminder', assignment_id: duty.id }
                        })
                    }
                }
            }
            // ------------------------------------------------------------------


            // B. GENERATION LOGIC (Next Week)
            // ------------------------------------------------------------------
            const { data: pools } = await supabaseAdmin.from('rotation_pools').select('*').eq('is_active', true)


            let createdCount = 0
            if (pools) {
                const targetDate = new Date()
                targetDate.setDate(targetDate.getDate() + 7) // 1 Week Notification Warning
                const targetDay = targetDate.getDay() // 0=Sun, 1=Mon...

                console.log(`Checking for date: ${targetDate.toISOString()}, Day: ${targetDay}`);

                for (const pool of pools) {
                    // Parse Schedule (Simple Format: "0 20 * * 1,4")
                    // Last part is days: "1,4"
                    if (!pool.cron_schedule) continue;

                    const parts = pool.cron_schedule.split(' ');
                    const dayPart = parts[parts.length - 1]; // "1" or "1,4" or "*"

                    // Convert JS Day (0=Sun) to Cron Day (0 or 7 = Sun)
                    // We'll check if our targetDay exists in the Cron definition
                    let isMatch = false;

                    if (dayPart === '*') {
                        isMatch = true;
                    } else {
                        const days = dayPart.split(',').map(d => parseInt(d));
                        // Handle Sunday (0 in JS, 0 or 7 in Cron)
                        if (targetDay === 0) {
                            isMatch = days.includes(0) || days.includes(7);
                        } else {
                            isMatch = days.includes(targetDay);
                        }
                    }

                    if (!isMatch) {
                        console.log(`Skipping pool ${pool.name} - Not scheduled for day ${targetDay}`);
                        continue;
                    }

                    // Proceed to Assign
                    const { data: members } = await supabaseAdmin
                        .from('rotation_pool_members')
                        .select('user_id')
                        .eq('pool_id', pool.id)
                        .order('sort_order', { ascending: true }) // Respect Manual Sort Order

                    if (!members || members.length === 0) continue;

                    // Find who is next
                    // To do this properly with "Rotation", we need to know who was LAST.
                    // But in this logic, we cycle through the list based on sort_order.
                    // A simple way: Rotate based on Week Number or just pick next from "last_assigned_at"

                    // Better approach: Get the member with OLDER last_assigned_at
                    const { data: nextMemberQuery } = await supabaseAdmin
                        .from('rotation_pool_members')
                        .select('user_id')
                        .eq('pool_id', pool.id)
                        .order('last_assigned_at', { ascending: true, nullsFirst: true }) // Nulls (never assigned) first
                        .order('sort_order', { ascending: true }) // Then by manual order
                        .limit(1);

                    if (nextMemberQuery && nextMemberQuery.length > 0) {
                        const nextUser = nextMemberQuery[0]

                        // Check collision
                        const { data: existing } = await supabaseAdmin
                            .from('duty_assignments')
                            .select('id')
                            .eq('pool_id', pool.id)
                            .eq('date', targetDate.toISOString().split('T')[0])
                            .single()

                        if (!existing) {
                            await supabaseAdmin.from('duty_assignments').insert({
                                pool_id: pool.id,
                                user_id: nextUser.user_id,
                                date: targetDate,
                                status: 'PENDING'
                            })

                            await supabaseAdmin.from('rotation_pool_members')
                                .update({ last_assigned_at: new Date() })
                                .eq('pool_id', pool.id)
                                .eq('user_id', nextUser.user_id)

                            createdCount++

                            // Send Notification
                            const { data: tokens } = await supabaseAdmin.from('user_push_tokens').select('token').eq('user_id', nextUser.user_id)
                            const pushTokens = tokens?.map(t => t.token) || []

                            const dateStr = targetDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
                            await sendExpoPush(pushTokens, 'Yeni Görev', `${dateStr} tarihli ${pool.name} görevi size atandı.`);

                            await supabaseAdmin.from('notifications').insert({
                                user_id: nextUser.user_id,
                                title: 'Haftalık Görev Ataması',
                                body: `${pool.name} için görevlendirildiniz: ${dateStr}`,
                                data: { type: 'duty_assigned' }
                            })
                        }
                    }
                }
            }
            return new Response(JSON.stringify({ message: 'Generation Complete', created: createdCount }), { headers: { 'Content-Type': 'application/json' } })
        }

        // 2. Expiration Check
        if (type === 'expire') {
            const todayStr = new Date().toISOString().split('T')[0]
            const { data: expiredList } = await supabaseAdmin
                .from('duty_assignments')
                .select('*, rotation_pools(*)')
                .eq('status', 'PENDING')
                .lt('date', todayStr)

            let rotatedCount = 0
            if (expiredList) {
                for (const assignment of expiredList) {
                    await supabaseAdmin.from('duty_assignments').update({ status: 'EXPIRED' }).eq('id', assignment.id)

                    const { data: members } = await supabaseAdmin
                        .from('rotation_pool_members')
                        .select('user_id, sort_order')
                        .eq('pool_id', assignment.pool_id)
                        .order('sort_order', { ascending: true })
                        .order('last_assigned_at', { ascending: true })

                    if (members && members.length > 1) {
                        const currentIndex = members.findIndex(m => m.user_id === assignment.user_id)
                        let nextIndex = (currentIndex + 1) % members.length
                        const nextMember = members[nextIndex]

                        const { data: newAssign } = await supabaseAdmin.from('duty_assignments').insert({
                            pool_id: assignment.pool_id,
                            user_id: nextMember.user_id,
                            date: assignment.date,
                            status: 'PENDING'
                        }).select().single()

                        // Notify New
                        const { data: tokens } = await supabaseAdmin.from('user_push_tokens').select('token').eq('user_id', nextMember.user_id)
                        const pushTokens = tokens?.map(t => t.token) || []
                        await sendExpoPush(pushTokens, 'Görev Devredildi (Süre Doldu)', `${assignment.rotation_pools.name} görevi size düştü.`);

                        await supabaseAdmin.from('notifications').insert({
                            user_id: nextMember.user_id,
                            title: 'Acil Görev Ataması',
                            body: 'Önceki görevli süresinde yanıt vermediği için görev size atandı.',
                            data: { type: 'duty_assigned', assignment_id: newAssign?.id }
                        })

                        rotatedCount++
                    }
                }
            }
            return new Response(JSON.stringify({ message: 'Expiration Check Complete', rotated: rotatedCount }), { headers: { 'Content-Type': 'application/json' } })
        }

        return new Response('Invalid type', { status: 400 })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } })
    }
})

