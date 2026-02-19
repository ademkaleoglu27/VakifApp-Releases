
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kyyvkmvdqvjpjfqfvnro.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXZrbXZkcXZqcGpmcWZ2bnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTI3MDMsImV4cCI6MjA4Mjg2ODcwM30.lMGgbzWzCxBy4fNJpT3zZNIFQAEzfxcpRpnLe-frj9I';
const GEMINI_API_KEY = 'AIzaSyCUpHKkbG9iDrJcePDsKDs2g0t40aBdn80'; // Paid Key

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function testRetrieval(queryText) {
    console.log(`🔍 Testing Retrieval for: "${queryText}"`);

    try {
        // 1. Generate Embedding
        console.log("Trying model: models/text-embedding-004");
        const embeddingModel = genAI.getGenerativeModel({ model: "models/text-embedding-004" });
        const result = await embeddingModel.embedContent(queryText);
        const embedding = result.embedding.values;

        console.log(`✅ Embedding Generated (Length: ${embedding.length})`);

        // 2. Query Supabase
        const { data, error } = await supabase.rpc('match_risale_chunks', {
            query_embedding: embedding,
            match_threshold: 0.5,
            match_count: 3
        });

        if (error) {
            console.error("❌ RPC Error:", error);
        } else {
            console.log(`✅ Found ${data.length} chunks:`);
            data.forEach((chunk, i) => {
                console.log(`--- Chunk ${i + 1} (Score: ${chunk.similarity.toFixed(4)}) ---`);
                console.log(chunk.content.substring(0, 150) + "...");
                console.log("---------------------------------------------------");
            });
        }

    } catch (error) {
        console.error("Test Failed:", error.message);
    }
}

testRetrieval("Bismillah her hayrın başıdır");
