
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { sendPushNotification } from "../_shared/fcm.ts"

// No Firebase needed

serve(async (req) => {
    try {
        let type;
        try {
            const body = await req.json()
            type = body.type;
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { "Content-Type": "application/json" } })
        }

        if (!type || (type !== 'generate' && type !== 'expire')) {
            return new Response(JSON.stringify({ error: "Missing or invalid 'type' parameter" }), { status: 400, headers: { "Content-Type": "application/json" } })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Weekly Generation & Reminders
        if (type === 'generate') {
            // A. REMINDER LOGIC (Check for Tomorrow's Duties)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            console.log(`Checking reminders for: ${tomorrowStr}`);

            // Fetch reminders with Vakif Context
            const { data: reminders } = await supabaseAdmin
                .from('duty_assignments')
                .select(`
                    id,
                    user_id,
                    pool_id,
                    vakif_id,
                    rotation_pools (name, vakif_id)
                `)
                .eq('date', tomorrowStr)
                .in('status', ['PENDING', 'CONFIRMED']);

            if (reminders && reminders.length > 0) {
                for (const duty of reminders) {
                    const vakifId = duty.vakif_id || (duty.rotation_pools as any)?.vakif_id;
                    if (!vakifId) continue;

                    const { data: tokens } = await supabaseAdmin.from('user_push_tokens').select('token').eq('user_id', duty.user_id)
                    const pushTokens = tokens?.map(t => t.token) || []

                    if (pushTokens.length > 0) {
                        const poolName = (duty.rotation_pools as any)?.name || 'Görev';
                        const result = await sendPushNotification(
                            pushTokens,
                            'Hatırlatma',
                            `Yarın ${poolName} nöbetiniz var!`,
                            undefined,
                            Deno.env.get('FCM_SERVICE_ACCOUNT')
                        );
                        console.log(`[duty_cron:reminder] Push sonuç:`, result);
                        if (result.expoFailed > 0 || result.fcmFailed > 0) {
                            console.warn(`[duty_cron:reminder] Başarısız bildirimler:`, result.errors);
                        }

                        // Log to DB with Tenant ID
                        await supabaseAdmin.from('notifications').insert({
                            user_id: duty.user_id,
                            title: 'Nöbet Hatırlatması',
                            body: `Yarın ${poolName} sırası sizde.`,
                            data: { type: 'duty_reminder', assignment_id: duty.id },
                            vakif_id: vakifId // TENANT ISOLATION
                        })
                    }
                }
            }

            // B. GENERATION LOGIC (Next Week)
            const { data: pools } = await supabaseAdmin
                .from('rotation_pools')
                .select('id, name, cron_schedule, vakif_id, is_active')
                .eq('is_active', true)

            let createdCount = 0
            if (pools) {
                const targetDate = new Date()
                targetDate.setDate(targetDate.getDate() + 7)
                const targetDay = targetDate.getDay()
                const targetDateStr = targetDate.toISOString().split('T')[0];

                console.log(`Checking for date: ${targetDateStr}, Day: ${targetDay}, Pool Count: ${pools.length}`);

                for (const pool of pools) {
                    const poolVakifId = pool.vakif_id;
                    if (!poolVakifId || !pool.cron_schedule) continue;

                    const parts = pool.cron_schedule.split(' ');
                    const dayPart = parts[parts.length - 1];

                    let isMatch = false;
                    if (dayPart === '*') {
                        isMatch = true;
                    } else {
                        const days = dayPart.split(',').map(d => parseInt(d));
                        isMatch = (targetDay === 0) ? (days.includes(0) || days.includes(7)) : days.includes(targetDay);
                    }

                    if (!isMatch) continue;

                    console.log(`Processing pool ${pool.name} [${pool.id}] for Vakif: ${poolVakifId}`);

                    const { data: members } = await supabaseAdmin
                        .from('rotation_pool_members')
                        .select('user_id')
                        .eq('pool_id', pool.id)
                        .order('sort_order', { ascending: true })

                    if (!members || members.length === 0) continue;

                    const memberIds = members.map(m => m.user_id);
                    const { data: validProfiles } = await supabaseAdmin
                        .from('profiles')
                        .select('id')
                        .in('id', memberIds)
                        .eq('vakif_id', poolVakifId);

                    const validMemberIds = new Set(validProfiles?.map(p => p.id));
                    const validMembers = members.filter(m => validMemberIds.has(m.user_id));

                    if (validMembers.length === 0) continue;

                    const { data: nextMemberQuery } = await supabaseAdmin
                        .from('rotation_pool_members')
                        .select('user_id')
                        .eq('pool_id', pool.id)
                        .in('user_id', Array.from(validMemberIds))
                        .order('last_assigned_at', { ascending: true, nullsFirst: true })
                        .order('sort_order', { ascending: true })
                        .limit(1);

                    if (nextMemberQuery && nextMemberQuery.length > 0) {
                        const nextUser = nextMemberQuery[0]
                        const { data: existing, error: existingError } = await supabaseAdmin
                            .from('duty_assignments')
                            .select('id')
                            .eq('pool_id', pool.id)
                            .eq('date', targetDateStr)
                            .maybeSingle()

                        if (!existing && !existingError) {
                            await supabaseAdmin.from('duty_assignments').insert({
                                pool_id: pool.id,
                                user_id: nextUser.user_id,
                                date: targetDateStr,
                                status: 'PENDING',
                                vakif_id: poolVakifId
                            })

                            await supabaseAdmin.from('rotation_pool_members')
                                .update({ last_assigned_at: new Date() })
                                .eq('pool_id', pool.id)
                                .eq('user_id', nextUser.user_id)

                            createdCount++

                            const { data: tokens } = await supabaseAdmin.from('user_push_tokens').select('token').eq('user_id', nextUser.user_id)
                            const pushTokens = tokens?.map(t => t.token) || []

                            const dateStr = targetDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
                            const result = await sendPushNotification(
                                pushTokens,
                                'Yeni Görev',
                                `${dateStr} tarihli ${pool.name} görevi size atandı.`,
                                { type: 'duty_assigned' },
                                Deno.env.get('FCM_SERVICE_ACCOUNT')
                            );
                            console.log(`[duty_cron:generation] Push sonuç:`, result);

                            await supabaseAdmin.from('notifications').insert({
                                user_id: nextUser.user_id,
                                title: 'Haftalık Görev Ataması',
                                body: `${pool.name} için görevlendirildiniz: ${dateStr}`,
                                data: { type: 'duty_assigned' },
                                vakif_id: poolVakifId
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
                .select('*, rotation_pools(name, vakif_id)')
                .eq('status', 'PENDING')
                .lt('date', todayStr)

            let rotatedCount = 0
            if (expiredList) {
                for (const assignment of expiredList) {
                    const poolVakifId = assignment.vakif_id || (assignment.rotation_pools as any)?.vakif_id;
                    if (!poolVakifId) continue;

                    await supabaseAdmin.from('duty_assignments').update({ status: 'EXPIRED' }).eq('id', assignment.id)

                    const { data: members } = await supabaseAdmin
                        .from('rotation_pool_members')
                        .select('user_id, sort_order')
                        .eq('pool_id', assignment.pool_id)
                        .order('sort_order', { ascending: true })
                        .order('last_assigned_at', { ascending: true })

                    if (members && members.length > 1) {
                        const memberIds = members.map(m => m.user_id);
                        const { data: validProfiles } = await supabaseAdmin
                            .from('profiles')
                            .select('id')
                            .in('id', memberIds)
                            .eq('vakif_id', poolVakifId);

                        const validMemberIds = new Set(validProfiles?.map(p => p.id));
                        const validMembers = members.filter(m => validMemberIds.has(m.user_id));

                        if (validMembers.length < 2) continue;

                        const currentIndex = validMembers.findIndex(m => m.user_id === assignment.user_id)
                        let nextIndex = (currentIndex !== -1) ? (currentIndex + 1) % validMembers.length : 0;
                        const nextMember = validMembers[nextIndex]

                        if (nextMember.user_id === assignment.user_id && validMembers.length > 1) continue;

                        const { data: newAssign } = await supabaseAdmin.from('duty_assignments').insert({
                            pool_id: assignment.pool_id,
                            user_id: nextMember.user_id,
                            date: assignment.date,
                            status: 'PENDING',
                            vakif_id: poolVakifId
                        }).select().single()

                        const { data: tokens } = await supabaseAdmin.from('user_push_tokens').select('token').eq('user_id', nextMember.user_id)
                        const pushTokens = tokens?.map(t => t.token) || []
                        const poolName = (assignment.rotation_pools as any)?.name || 'Görev';

                        const result = await sendPushNotification(
                            pushTokens,
                            'Görev Devredildi (Süre Doldu)',
                            `${poolName} görevi size düştü.`,
                            undefined,
                            Deno.env.get('FCM_SERVICE_ACCOUNT')
                        );
                        console.log(`[duty_cron:expiration] Push sonuç:`, result);

                        await supabaseAdmin.from('notifications').insert({
                            user_id: nextMember.user_id,
                            title: 'Acil Görev Ataması',
                            body: 'Önceki görevli süresinde yanıt vermediği için görev size atandı.',
                            data: { type: 'duty_assigned', assignment_id: newAssign?.id },
                            vakif_id: poolVakifId
                        })

                        rotatedCount++
                    }
                }
            }
            return new Response(JSON.stringify({ message: 'Expiration Check Complete', rotated: rotatedCount }), { headers: { 'Content-Type': 'application/json' } })
        }

        return new Response('Invalid type', { status: 400 })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
    }
})
