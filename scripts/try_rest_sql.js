const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL() {
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260225_fix_reading_logs_insert_rls.sql');
    const sqlData = fs.readFileSync(sqlPath, 'utf8');

    // Trying multiple generic RPC names that might exist on standard Postgres extensions or Supabase
    const rpcNames = ['exec', 'execute_sql', 'run_sql', 'sql'];
    let success = false;

    for (const name of rpcNames) {
        console.log(`Trying RPC: ${name}...`);
        const { data, error } = await supabase.rpc(name, { query: sqlData });

        if (!error) {
            console.log(`Success with ${name}!`);
            success = true;
            break;
        } else if (error.code !== 'PGRST202' && !error.message.includes('Could not find the function')) {
            // It found the function but it failed during execution
            console.error(`Error executing ${name}:`, error);
        }
    }

    if (!success) {
        console.log("\n--- No SQL Execution RPC found. You will need to run this manually in the Supabase Dashboard SQL Editor ---");
        console.log("\n" + sqlData);
    }
}

runSQL();
