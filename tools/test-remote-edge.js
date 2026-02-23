
const fetch = require('node-fetch');
require('dotenv').config();

const doFetch = async () => {
    const URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gemini-chat`;
    const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    console.log(`Testing URL: ${URL}`);

    // Simulation of what supabase.functions.invoke sends
    // When you pass { body: { ... } }, supabase-js sends the content of 'body' as the JSON payload.
    // So the payload ON THE WIRE is { prompt: "...", history: [] }.
    // My previous script did exactly this.
    // Let's try to replicate valid vs invalid structures.

    const payload = {
        prompt: "Selamun aleyküm",
        history: []
    };

    console.log("Sending payload:", JSON.stringify(payload));

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        const text = await response.text();
        console.log('Body:', text);

    } catch (error) {
        console.error('Fetch Error:', error);
    }
};

doFetch();
