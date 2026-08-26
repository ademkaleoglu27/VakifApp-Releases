const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// We use SERVICE_ROLE to bypass any auth restrictions and just test the function logic
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    console.log("Testing get_reading_leaderboard RPC...");

    // Test with the 0001 Vakif ID
    const testVakifId = '00000000-0000-0000-0000-000000000001';

    // Try week, month, year
    for (const range of ['week', 'month', 'year']) {
        console.log(`\n--- Fetching leaderbord for range: ${range}, Vakif: ${testVakifId} ---`);

        const { data, error } = await supabase.rpc('get_reading_leaderboard', {
            p_vakif_id: testVakifId,
            p_range_type: range,
            p_limit: 50,
            p_include_zero: true
        });

        if (error) {
            console.error(`Error for ${range}:`, error);
        } else {
            console.log(`Result count: ${data ? data.length : 0}`);
            if (data && data.length > 0) {
                // Just show the top 2
                console.dir(data.slice(0, 3), { depth: null });
            } else {
                console.log("Empty result set!");
            }
        }
    }
}

testRpc();
