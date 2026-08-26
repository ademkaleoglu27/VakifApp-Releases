const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGemini() {
    console.log("Testing gemini-chat edge function...");
    try {
        const { data, error } = await supabase.functions.invoke('gemini-chat', {
            body: {
                prompt: 'Uhuvvet nedir?',
                history: []
            }
        });

        if (error) {
            console.error("❌ Edge Function returned an explicit error object.");
            console.error("Error Message:", error.message);
            console.error("Error Name:", error.name);
            console.error("Error Context (if any):", JSON.stringify(error.context, null, 2));

            // If it's a non-2xx, supabase-js `error` object sometimes contains "context" with the HTTP response details.
        } else {
            console.log("✅ Success!");
            console.log(data);
        }
    } catch (e) {
        console.error("Caught exception:", e);
    }
}

testGemini();
