
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
                    // Ensure Tenant Safety: Skip if duty vakif_id contradicts pool vakif_id (data integrity check)
                    // Or simply rely on the fact we need to notify the user.
                    // Important: Insert notification with the correct vakif_id.

                    const vakifId = duty.vakif_id || (duty.rotation_pools as any)?.vakif_id;
                    if (!vakifId) continue; // Skip if no tenant context

                    // Send Reminder Push
                    const { data: tokens } = await supabaseAdmin.from('user_push_tokens').select('token').eq('user_id', duty.user_id)
                    const pushTokens = tokens?.map(t => t.token) || []

                    if (pushTokens.length > 0) {
                        const poolName = (duty.rotation_pools as any)?.name || 'Görev';
                        await sendExpoPush(pushTokens, 'Hatırlatma', `Yarın ${poolName} nöbetiniz var!`);

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
            // ------------------------------------------------------------------


            // B. GENERATION LOGIC (Next Week)
            // ------------------------------------------------------------------
            // Fetch Active Pools WITH Vakif ID
            const { data: pools } = await supabaseAdmin
                .from('rotation_pools')
                .select('id, name, cron_schedule, vakif_id, is_active')
                .eq('is_active', true)


            let createdCount = 0
            if (pools) {
                const targetDate = new Date()
                targetDate.setDate(targetDate.getDate() + 7) // 1 Week Notification Warning
                const targetDay = targetDate.getDay() // 0=Sun, 1=Mon...
                const targetDateStr = targetDate.toISOString().split('T')[0]; // HARDENING: Use strictly formatted date string

                console.log(`Checking for date: ${targetDateStr}, Day: ${targetDay}, Pool Count: ${pools.length}`);

                for (const pool of pools) {
                    const poolVakifId = pool.vakif_id;
                    if (!poolVakifId) {
                        console.warn(`Skipping pool ${pool.id} - Missing vakif_id`);
                        continue;
                    }

                    // Parse Schedule (Simple Format: "0 20 * * 1,4")
                    // Last part is days: "1,4"
                    if (!pool.cron_schedule) continue;

                    const parts = pool.cron_schedule.split(' ');
                    const dayPart = parts[parts.length - 1]; // "1" or "1,4" or "*"

                    // Convert JS Day (0=Sun) to Cron Day (0 or 7 = Sun)
                    let isMatch = false;

                    if (dayPart === '*') {
                        isMatch = true;
                    } else {
                        const days = dayPart.split(',').map(d => parseInt(d));
                        if (targetDay === 0) {
                            isMatch = days.includes(0) || days.includes(7);
                        } else {
                            isMatch = days.includes(targetDay);
                        }
                    }

                    if (!isMatch) {
                        // console.log(`Skipping pool ${pool.name} (${poolVakifId}) - Not scheduled today`);
                        continue;
                    }

                    console.log(`Processing pool ${pool.name} [${pool.id}] for Vakif: ${poolVakifId}`);

                    // Proceed to Assign from Members
                    const { data: members } = await supabaseAdmin
                        .from('rotation_pool_members')
                        .select('user_id')
                        .eq('pool_id', pool.id)
                        .order('sort_order', { ascending: true })

                    if (!members || members.length === 0) continue;

                    // Verify Members Tenant Integrity (Prevent Cross-Talk)
                    const memberIds = members.map(m => m.user_id);
                    const { data: validProfiles } = await supabaseAdmin
                        .from('profiles')
                        .select('id')
                        .in('id', memberIds)
                        .eq('vakif_id', poolVakifId); // STRICT TENANT CHECK

                    const validMemberIds = new Set(validProfiles?.map(p => p.id));
                    const validMembers = members.filter(m => validMemberIds.has(m.user_id));

                    if (validMembers.length === 0) {
                        console.warn(`No valid members found for pool ${pool.name} in vakif ${poolVakifId} (Mismatch?)`);
                        continue;
                    }

                    // Find who is next
                    const { data: nextMemberQuery } = await supabaseAdmin
                        .from('rotation_pool_members')
                        .select('user_id')
                        .eq('pool_id', pool.id)
                        .in('user_id', Array.from(validMemberIds)) // Ensure we select from valid subset
                        .order('last_assigned_at', { ascending: true, nullsFirst: true })
                        .order('sort_order', { ascending: true })
                        .limit(1);

                    if (nextMemberQuery && nextMemberQuery.length > 0) {
                        const nextUser = nextMemberQuery[0]

                        // Check collision
                        const { data: existing, error: existingError } = await supabaseAdmin
                            .from('duty_assignments')
                            .select('id')
                            .eq('pool_id', pool.id)
                            .eq('date', targetDateStr) // HARDENING: Use string comparison
                            .maybeSingle() // HARDENING: Handle row not found gracefully

                        if (!existing && !existingError) {
                            // Insert with TENANT ID
                            await supabaseAdmin.from('duty_assignments').insert({
                                pool_id: pool.id,
                                user_id: nextUser.user_id,
                                date: targetDateStr, // HARDENING: Use string
                                status: 'PENDING',
                                vakif_id: poolVakifId // TENANT ISOLATION
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

                            // Insert Notification with TENANT ID
                            await supabaseAdmin.from('notifications').insert({
                                user_id: nextUser.user_id,
                                title: 'Haftalık Görev Ataması',
                                body: `${pool.name} için görevlendirildiniz: ${dateStr}`,
                                data: { type: 'duty_assigned' },
                                vakif_id: poolVakifId // TENANT ISOLATION
                            })
                        }
                    }
                }
            }
            return new Response(JSON.stringify({ message: 'Generation Complete', created: createdCount }), { headers: { 'Content-Type': 'application/json' } })
        }

        // 2. Expiration Check
        if (type === 'expire') {
            // Need to fetch vakif_id as well
            const todayStr = new Date().toISOString().split('T')[0]
            const { data: expiredList } = await supabaseAdmin
                .from('duty_assignments')
                .select('*, rotation_pools(name, vakif_id)') // Fetch pool vakif info
                .eq('status', 'PENDING')
                .lt('date', todayStr)

            let rotatedCount = 0
            if (expiredList) {
                for (const assignment of expiredList) {
                    const poolVakifId = assignment.vakif_id || (assignment.rotation_pools as any)?.vakif_id;
                    if (!poolVakifId) continue;

                    await supabaseAdmin.from('duty_assignments').update({ status: 'EXPIRED' }).eq('id', assignment.id)

                    // Reassign Logic (Tenant Aware)
                    const { data: members } = await supabaseAdmin
                        .from('rotation_pool_members')
                        .select('user_id, sort_order')
                        .eq('pool_id', assignment.pool_id)
                        .order('sort_order', { ascending: true })
                        .order('last_assigned_at', { ascending: true })

                    if (members && members.length > 1) {
                        // Verify Tenant Integrity again for safety
                        const memberIds = members.map(m => m.user_id);
                        const { data: validProfiles } = await supabaseAdmin
                            .from('profiles')
                            .select('id')
                            .in('id', memberIds)
                            .eq('vakif_id', poolVakifId);

                        const validMemberIds = new Set(validProfiles?.map(p => p.id));
                        const validMembers = members.filter(m => validMemberIds.has(m.user_id));

                        if (validMembers.length < 2) continue; // Not enough valid members to rotate

                        const currentIndex = validMembers.findIndex(m => m.user_id === assignment.user_id)
                        // If current user not valid anymore (moved tenant?), just take the first valid one
                        let nextIndex = 0;
                        if (currentIndex !== -1) {
                            nextIndex = (currentIndex + 1) % validMembers.length
                        }

                        const nextMember = validMembers[nextIndex]

                        // Prevent assigning to same person if only 1 valid member exists? 
                        if (nextMember.user_id === assignment.user_id && validMembers.length > 1) {
                            // Should not happen with mod logic unless logic flaw, skip safe
                            continue;
                        }

                        const { data: newAssign } = await supabaseAdmin.from('duty_assignments').insert({
                            pool_id: assignment.pool_id,
                            user_id: nextMember.user_id,
                            date: assignment.date, // Use existing date string from DB
                            status: 'PENDING',
                            vakif_id: poolVakifId // TENANT ISOLATION
                        }).select().single()

                        // Notify New
                        const { data: tokens } = await supabaseAdmin.from('user_push_tokens').select('token').eq('user_id', nextMember.user_id)
                        const pushTokens = tokens?.map(t => t.token) || []
                        const poolName = (assignment.rotation_pools as any)?.name || 'Görev';

                        await sendExpoPush(pushTokens, 'Görev Devredildi (Süre Doldu)', `${poolName} görevi size düştü.`);

                        await supabaseAdmin.from('notifications').insert({
                            user_id: nextMember.user_id,
                            title: 'Acil Görev Ataması',
                            body: 'Önceki görevli süresinde yanıt vermediği için görev size atandı.',
                            data: { type: 'duty_assigned', assignment_id: newAssign?.id },
                            vakif_id: poolVakifId // TENANT ISOLATION
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
