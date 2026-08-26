
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// --- UTILS ---

async function getExistingCount() {
    const { count, error } = await supabase
        .from('risale_dictionary')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("❌ Error fetching count:", error.message);
        return 0;
    }
    return count;
}

// Retry wrapper for embedding with exponential backoff
async function generateEmbedding(text, retries = 3) {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        if (retries > 0 && (error.status === 429 || error.message.includes('429'))) {
            const delay = 2000 * (4 - retries); // 2s, 4s, 6s...
            console.warn(`⚠️ Rate limit hit. Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            return generateEmbedding(text, retries - 1);
        }
        console.error(`❌ Embedding Error for "${text.substring(0, 20)}...":`, error.message);
        return null;
    }
}

function parseSqlDump(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const entries = [];
    const regex = /\(\d+, '[^']+', '([^']+)', '[^']+', '([^']+)'\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        entries.push({
            word: match[1],
            definition: match[2].trim()
        });
    }
    return entries;
}

// --- MAIN PROCESS ---

async function processDictionary() {
    console.log("🚀 Starting OPTIMIZED Dictionary Ingestion...");
    console.log("⚡ Batch Size: 25 | Model: gemini-embedding-001");

    const filePath = path.join(__dirname, '../db_lugat.sql');
    if (!fs.existsSync(filePath)) {
        console.error("❌ File not found:", filePath);
        return;
    }

    const entries = parseSqlDump(filePath);
    console.log(`📖 Parsed ${entries.length} dictionary entries.`);

    // RESUME LOGIC
    console.log("🔍 Checking for existing entries...");
    const startCount = await getExistingCount();
    console.log(`📊 Found ${startCount} existing entries.`);

    if (startCount >= entries.length) {
        console.log("✅ All entries already ingested!");
        return;
    }

    console.log(`⏩ Resuming from index ${startCount}...`);

    // Adjusted settings for stability
    const BATCH_SIZE = 10;
    let successCount = 0;

    for (let i = startCount; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const rowsToInsert = [];
        const startTime = Date.now();

        // Process batch in parallel
        await Promise.all(batch.map(async (entry) => {
            const textToEmbed = `${entry.word}: ${entry.definition}`;
            const embedding = await generateEmbedding(textToEmbed);
            if (embedding) {
                rowsToInsert.push({
                    word: entry.word,
                    definition: entry.definition,
                    embedding: embedding
                });
            }
        }));

        if (rowsToInsert.length > 0) {
            let inserted = false;
            let listRetries = 3;

            while (!inserted && listRetries > 0) {
                const { error } = await supabase
                    .from('risale_dictionary')
                    .insert(rowsToInsert);

                if (error) {
                    console.error(`❌ Insert Error (Batch ${i} - Attempt ${4 - listRetries}):`, error.message);
                    if (error.message.includes('timeout') || error.message.includes('503')) {
                        console.log("⏳ Retrying insert in 3s...");
                        await new Promise(r => setTimeout(r, 3000));
                        listRetries--;
                    } else {
                        break; // Fatal error, don't retry
                    }
                } else {
                    successCount += rowsToInsert.length;
                    const elapsed = Date.now() - startTime;
                    console.log(`✅ Indexed ${i + rowsToInsert.length} / ${entries.length} (Batch took ${elapsed}ms)`);
                    inserted = true;
                }
            }
        }

        // Delay to prevent rate limiting / DB load
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("🎉 Dictionary Ingestion Complete!");
}

processDictionary();
