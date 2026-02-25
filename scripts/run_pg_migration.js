const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

// We need the postgres connection string, usually in .env or we can derive it from the URL
// Typically something like: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres

let dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    // Attempt to reconstruct if missing, though it requires the db password
    console.error("DATABASE_URL is missing in .env. We cannot directly run SQL without the postgres connection string.");
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
    // Supabase requires SSL for remote connections
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        await client.connect();
        console.log("Connected to PostgreSQL.");

        const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260225_fix_reading_logs_insert_rls.sql');
        const sqlData = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing Migration...");
        await client.query(sqlData);

        console.log("Migration executed successfully!");
    } catch (err) {
        console.error("Error executing migration:", err);
    } finally {
        await client.end();
    }
}

runMigration();
