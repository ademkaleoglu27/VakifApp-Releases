
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
