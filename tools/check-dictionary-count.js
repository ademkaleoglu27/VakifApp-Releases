
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
