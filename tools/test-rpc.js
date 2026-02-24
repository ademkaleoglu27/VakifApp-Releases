const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function main() {
    // Read env vars
    const envFile = fs.readFileSync('.env', 'utf-8');
    let url = '';
    let key = '';

    envFile.split('\n').forEach(line => {
        if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
        if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
    });

    const supabase = createClient(url, key);

    console.log("Testing RPC get_reading_leaderboard...");

    // We don't have auth, but we can try to call it and see the exact server error.
    // If it fails with "column type mismatch", it will bypass RLS.
    // Let's pass random vakif ID
    const { data, error } = await supabase.rpc('get_reading_leaderboard', {
        p_vakif_id: '00000000-0000-0000-0000-000000000001',
        p_range_type: 'week',
        p_include_zero: true
    });

    console.log("Error:", JSON.stringify(error, null, 2));
    console.log("Data length:", data ? data.length : 0);
}

main();
