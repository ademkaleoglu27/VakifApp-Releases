const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    console.log("Calling debug_reading_logs RPC to bypass RLS...");

    const { data, error } = await supabase.rpc('debug_reading_logs');

    if (error) {
        console.error("Error fetching debug reading logs:", error);
    } else {
        console.log("RAW SUPABASE DATA (Last 20 rows):");
        console.dir(data, { depth: null });
    }
}

checkDatabase();
