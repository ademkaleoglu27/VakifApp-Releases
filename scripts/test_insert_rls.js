const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertWithAuth() {
    // 1. Login with a test user (I'll need to know a user or we can just try to see if it allows anon - which it shouldn't)
    // Actually, I don't have a user password handy. Let's just create a new test user, insert, and delete.

    console.log("Creating test user...");
    const testEmail = `test_${Date.now()}@vakifapp.test`;
    const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!'
    });

    if (authErr) {
        console.error("SignUp Error:", authErr);
        return;
    }

    console.log("User created:", authData.user.id);

    // 2. Try to insert reading log
    console.log("Attempting to insert reading log...");
    const { error: insertErr } = await supabase.from('reading_logs').insert([{
        id: '33333333-3333-3333-3333-333333333333',
        user_id: authData.user.id,
        vakif_id: '00000000-0000-0000-0000-000000000001', // Valid Vakif ID
        book_id: 'risale-i-nur',
        pages_read: 10,
        duration_minutes: 0,
        date: new Date().toISOString()
    }]);

    if (insertErr) {
        console.error("Insert Error:", JSON.stringify(insertErr, null, 2));
    } else {
        console.log("Insert Success!");
    }

}

testInsertWithAuth();
