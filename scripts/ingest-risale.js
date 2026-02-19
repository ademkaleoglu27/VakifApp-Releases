
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
// User's Keys
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kyyvkmvdqvjpjfqfvnro.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXZrbXZkcXZqcGpmcWZ2bnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTI3MDMsImV4cCI6MjA4Mjg2ODcwM30.lMGgbzWzCxBy4fNJpT3zZNIFQAEzfxcpRpnLe-frj9I';
const GEMINI_API_KEY = 'AIzaSyC6pD-q5oh5ah_82sqYfoX8deKEuP3dNJY'; // New working key

// Initialize Clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// --- UTILS ---

async function generateEmbedding(text) {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("Embedding Error:", error.message);
        return null;
    }
}

// Simple chunking strategy: Split by paragraphs, group into ~800 chars
function chunkText(fullText) {
    const paragraphs = fullText.split(/\n\s*\n/); // Split by empty lines
    const chunks = [];
    let currentChunk = "";

    for (const para of paragraphs) {
        const cleanPara = para.trim();
        if (!cleanPara) continue;

        if ((currentChunk.length + cleanPara.length) > 800) {
            chunks.push(currentChunk);
            currentChunk = cleanPara;
        } else {
            currentChunk += (currentChunk ? "\n" : "") + cleanPara;
        }
    }
    if (currentChunk) chunks.push(currentChunk);

    return chunks;
}

// --- MAIN PROCESS ---

async function processFile() {
    console.log("🚀 Starting Ingestion Process...");

    const filePath = path.join(__dirname, '../corpus_input.txt');
    if (!fs.existsSync(filePath)) {
        console.error("❌ File not found:", filePath);
        return;
    }

    const text = fs.readFileSync(filePath, 'utf-8');
    console.log(`📄 Read ${text.length} chars from corpus.`);

    const chunks = chunkText(text);
    console.log(`🧩 Created ${chunks.length} chunks.`);

    console.log("⏳ Starting embedding generation and upload (Batch size: 10)...");

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 10;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const rowsToInsert = [];

        await Promise.all(batch.map(async (chunkContent, index) => {
            const embedding = await generateEmbedding(chunkContent);
            if (embedding) {
                rowsToInsert.push({
                    content: chunkContent,
                    source_book: "Risale-i Nur (Genel)", // TODO: Parse book names later
                    embedding: embedding
                });
            }
        }));

        if (rowsToInsert.length > 0) {
            const { error } = await supabase
                .from('risale_chunks')
                .insert(rowsToInsert);

            if (error) {
                console.error(`❌ Insert Error (Batch ${i}):`, error.message);
            } else {
                console.log(`✅ Indexed ${i + rowsToInsert.length} / ${chunks.length}`);
            }
        }

        // Small delay to be nice to API
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("🎉 Ingestion Complete!");
}

processFile();
