
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kyyvkmvdqvjpjfqfvnro.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXZrbXZkcXZqcGpmcWZ2bnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTI3MDMsImV4cCI6MjA4Mjg2ODcwM30.lMGgbzWzCxBy4fNJpT3zZNIFQAEzfxcpRpnLe-frj9I';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCUpHKkbG9iDrJcePDsKDs2g0t40aBdn80';

// Initialize Clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// --- UTILS ---

async function getAllExistingWords() {
    console.log("📥 Fetching all existing words from DB...");
    let allWords = new Set();
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('risale_dictionary')
            .select('word') // Only fetch word column for speed
            .range(from, from + limit - 1);

        if (error) {
            console.error("❌ Error fetching words:", error.message);
            process.exit(1);
        }

        if (data.length > 0) {
            data.forEach(row => allWords.add(row.word));
            from += limit;
            process.stdout.write(`📊 Loaded ${allWords.size} words...\r`);
        } else {
            hasMore = false;
        }
    }
    console.log(`\n✅ Loaded ${allWords.size} unique words from DB.`);
    return allWords;
}

// Retry wrapper for embedding
async function generateEmbedding(text, retries = 3) {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        if (retries > 0) {
            const delay = 2000;
            await new Promise(r => setTimeout(r, delay));
            return generateEmbedding(text, retries - 1);
        }
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

async function fillGaps() {
    console.log("🚀 Starting Gap Fill Process...");

    // 1. Load Source
    const filePath = path.join(__dirname, '../db_lugat.sql');
    const sourceEntries = parseSqlDump(filePath);
    console.log(`📖 Source has ${sourceEntries.length} entries.`);

    // 2. Load DB
    const existingWords = await getAllExistingWords();

    // 3. Find Missing
    // Note: Assuming 'word' is unique identifier. 
    // If multiple entries have same word but different definitions, this naive check mimics existing logic slightly but works for "filling gaps" generally.
    // Ideally we check combination, but simple word check catches batch failures usually.
    const missingEntries = sourceEntries.filter(entry => !existingWords.has(entry.word));

    console.log(`🔍 Found ${missingEntries.length} missing entries.`);

    if (missingEntries.length === 0) {
        console.log("🎉 No gaps found! Dictionary is complete.");
        return;
    }

    // 4. Ingest Missing
    console.log("🛠️ Ingesting missing entries...");
    const BATCH_SIZE = 5;

    for (let i = 0; i < missingEntries.length; i += BATCH_SIZE) {
        const batch = missingEntries.slice(i, i + BATCH_SIZE);
        const rowsToInsert = [];

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
            const { error } = await supabase
                .from('risale_dictionary')
                .insert(rowsToInsert);

            if (error) {
                console.error(`❌ Insert Error:`, error.message);
            } else {
                console.log(`✅ Restored ${Math.min(i + rowsToInsert.length, missingEntries.length)} / ${missingEntries.length}`);
            }
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("🎉 Gap Fill Complete!");
}

fillGaps();
