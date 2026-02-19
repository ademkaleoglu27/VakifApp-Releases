
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kyyvkmvdqvjpjfqfvnro.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXZrbXZkcXZqcGpmcWZ2bnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTI3MDMsImV4cCI6MjA4Mjg2ODcwM30.lMGgbzWzCxBy4fNJpT3zZNIFQAEzfxcpRpnLe-frj9I';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCount() {
    const { count, error } = await supabase
        .from('risale_dictionary')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log(`📊 Dictionary Entries: ${count}`);
    }
}

checkCount();
