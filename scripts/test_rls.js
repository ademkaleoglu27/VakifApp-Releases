const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    const { data, error } = await supabase.rpc('execute_sql_query', {
        query: `
            SELECT pol.polname, pol.polcmd, pol.polqual, pol.polwithcheck
            FROM pg_policy pol
            JOIN pg_class tbl ON pol.polrelid = tbl.oid
            WHERE tbl.relname = 'reading_logs'
        `
    });

    if (error) {
        console.error("RPC Error:", error);

        // Let's try inserting with a valid service role key if we have one in env (we probably don't)
        // Or we can just try to see if it allows an authenticated user.
    } else {
        console.log("RLS Policies for reading_logs:", JSON.stringify(data, null, 2));
    }
}

checkRLS();
