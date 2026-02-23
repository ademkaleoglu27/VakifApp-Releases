
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
// Using gemini-embedding-001 (3072 dims) which matches Phase 1 setup.
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

async function generateEmbedding(text) {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("Embedding Error:", error.message);
        return null; // Return null to handle gracefully
    }
}

function parseSqlDump(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const entries = [];
    // Regex to match INSERT INTO values
    // Matches: (1, 'A0', 'Kelime', 'kirpilmis', 'Anlam')
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
    console.log("📚 Starting Dictionary Ingestion...");

    const filePath = path.join(__dirname, '../db_lugat.sql');
    if (!fs.existsSync(filePath)) {
        console.error("❌ File not found:", filePath);
        return;
    }

    const entries = parseSqlDump(filePath);
    console.log(`📖 Parsed ${entries.length} dictionary entries.`);

    // RESUME LOGIC
    console.log("🔍 Checking for existing entries to resume...");
    const startCount = await getExistingCount();
    console.log(`📊 Found ${startCount} existing entries in Supabase.`);

    if (startCount >= entries.length) {
        console.log("✅ All entries already ingested!");
        return;
    }

    console.log(`⏩ Resuming from index ${startCount}...`);
    console.log("⏳ Starting embedding generation and upload (Batch size: 3, Delay: 2s)...");

    const BATCH_SIZE = 3;

    for (let i = startCount; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const rowsToInsert = [];

        await Promise.all(batch.map(async (entry) => {
            // Embed: "Kelime: [Word]. Anlam: [Definition]"
            const textToEmbed = `${entry.word}: ${entry.definition}`;

            const embedding = await generateEmbedding(textToEmbed);
            if (embedding) {
                rowsToInsert.push({
                    word: entry.word,
                    definition: entry.definition,
                    embedding: embedding
                });
            } else {
                console.warn(`⚠️ Skipping '${entry.word}' due to embedding failure.`);
            }
        }));

        if (rowsToInsert.length > 0) {
            const { error } = await supabase
                .from('risale_dictionary')
                .insert(rowsToInsert);

            if (error) {
                console.error(`❌ Insert Error (Batch starting at ${i}):`, error.message);
            } else {
                console.log(`✅ Indexed ${i + rowsToInsert.length} / ${entries.length}`);
            }
        }

        // DELAY: 2 Seconds after every batch (3 items) as requested
        // Using 2100ms to be safe
        await new Promise(r => setTimeout(r, 2100));
    }

    console.log("🎉 Dictionary Ingestion Complete!");
}

processDictionary();
