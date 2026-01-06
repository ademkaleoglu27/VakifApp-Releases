
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        // 1. Auth Check
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) return new Response('Unauthorized', { status: 401 })

        // 2. Check Caller Role (Must be 'mesveret_admin')
        const { data: callerProfile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (callerProfile?.role !== 'mesveret_admin') {
            return new Response('Forbidden: Only Admins can set roles.', { status: 403 })
        }

        // 3. Parse Input
        const { target_user_id, new_role } = await req.json()

        // Validate Role
        const validRoles = ['mesveret_admin', 'sohbet_member', 'accountant']
        if (!validRoles.includes(new_role)) {
            return new Response('Invalid Role', { status: 400 })
        }

        // 4. Update Target Profile (Using Service Role to bypass the Trigger restriction if needed, or just admin access)
        // We used a Trigger that allows 'service_role'. So we MUST use Service Role client here.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ role: new_role })
            .eq('id', target_user_id)

        if (updateError) throw updateError

        return new Response(JSON.stringify({ message: 'Role updated successfully', role: new_role }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 400
        })
    }
})
