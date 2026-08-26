require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function testGeminiFetch() {
    const functionUrl = `${supabaseUrl}/functions/v1/gemini-chat`;

    console.log(`Sending POST to ${functionUrl}`);

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
                prompt: 'Uhuvvet nedir?',
                history: []
            })
        });

        const status = response.status;
        const text = await response.text();

        console.log(`HTTP Status: ${status}`);
        console.log(`Response Body:`);
        console.log(text);

        if (!response.ok) {
            console.error("❌ Request failed.");
        } else {
            console.log("✅ Request succeeded.");
        }
    } catch (e) {
        console.error("Network/Fetch Error:", e);
    }
}

testGeminiFetch();
