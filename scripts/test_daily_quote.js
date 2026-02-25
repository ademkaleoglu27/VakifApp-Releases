require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function triggerDailyQuote() {
    const functionUrl = `${supabaseUrl}/functions/v1/generate_daily_quote`;

    console.log(`Triggering Edge Function: ${functionUrl}`);

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        const status = response.status;
        const text = await response.text();

        console.log(`HTTP Status: ${status}`);
        console.log(`Response Body:`);
        console.log(text);

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

triggerDailyQuote();
