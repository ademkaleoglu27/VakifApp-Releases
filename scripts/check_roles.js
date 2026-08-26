
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkRoles() {
    console.log("--- Supabase Role Diagnostic ---");

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('role');

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    const uniqueRoles = [...new Set(profiles.map(p => p.role))];
    console.log("Unique roles found in DB:", uniqueRoles);

    // Also check if there's a 'mesveret_admin' or similar
    const counts = {};
    profiles.forEach(p => {
        counts[p.role] = (counts[p.role] || 0) + 1;
    });
    console.log("Role counts:", counts);
}

checkRoles();
