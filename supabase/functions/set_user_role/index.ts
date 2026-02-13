
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
        if (userError || !user) {
            console.error('Auth User Error:', userError)
            return new Response(JSON.stringify({ error: 'Unauthorized: No user found' }), { headers: { "Content-Type": "application/json" }, status: 401 })
        }

        console.log('User ID:', user.id)

        // 2. Check Caller Role (Must be 'mesveret_admin')
        const { data: callerProfile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        console.log('Caller Profile:', callerProfile)

        if (callerProfile?.role !== 'mesveret_admin' && callerProfile?.role !== 'platform_admin') {
            console.error('Permission Denied. Role:', callerProfile?.role)
            return new Response(JSON.stringify({ error: `Forbidden: Admin role required (Current: ${callerProfile?.role})` }), { headers: { "Content-Type": "application/json" }, status: 403 })
        }

        // 3. Parse Input
        const { target_user_id, new_role } = await req.json()
        console.log('Input:', { target_user_id, new_role })

        // Validate Role
        const validRoles = ['mesveret_admin', 'sohbet_member', 'accountant', 'platform_admin', 'guest']
        if (!validRoles.includes(new_role)) {
            console.error('Invalid role:', new_role)
            return new Response(JSON.stringify({ error: `Invalid Role: ${new_role}` }), { headers: { "Content-Type": "application/json" }, status: 400 })
        }

        // 4. Update Target Profile (Using Service Role to bypass the Trigger restriction if needed, or just admin access)
        // We used a Trigger that allows 'service_role'. So we MUST use Service Role client here.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log('Attempting update with service role...')

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ role: new_role })
            .eq('id', target_user_id)

        if (updateError) {
            console.error('Update Error:', updateError)
            throw updateError
        }

        console.log('SUCCESS: Role updated for', target_user_id, 'to', new_role)

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
