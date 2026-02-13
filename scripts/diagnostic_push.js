
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// Using service role key if available for full access
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function diagnostic() {
    console.log("--- Supabase Push Token Diagnostic ---");

    // 1. Check user_push_tokens
    const { data: tokens, error: tokenError } = await supabase
        .from('user_push_tokens')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

    if (tokenError) {
        console.error("Error fetching tokens:", tokenError);
    } else {
        console.log(`Found ${tokens.length} recent tokens:`);
        tokens.forEach(t => {
            const isExpo = t.token.startsWith('ExponentPushToken') || t.token.startsWith('ExpoPushToken');
            console.log(`- User: ${t.user_id}, Type: ${t.device_type}, Format: ${isExpo ? 'EXPO' : 'FCM'}, Updated: ${t.updated_at}`);
            console.log(`  Token: ${t.token.substring(0, 20)}...`);
        });
    }

    // 2. Check notifications table
    const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (notifError) {
        console.error("Error fetching notifications:", notifError);
    } else {
        console.log(`\nLast 5 notifications in DB:`);
        notifications.forEach(n => {
            console.log(`- ${n.created_at}: ${n.title} (User: ${n.user_id})`);
        });
    }
}

diagnostic();
