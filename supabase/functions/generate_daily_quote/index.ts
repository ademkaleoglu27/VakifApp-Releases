import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log("Triggering Daily Quote Generation...");

        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        // We MUST use the service role key to bypass RLS for inserting into `daily_quotes`
        // since the cron job or anon client isn't an authenticated user.
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Missing environment configuration.');
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

        // 1. Get today's date in YYYY-MM-DD
        // Using Istanbul Timezone (UTC+3) to ensure the quote changes at midnight in Turkey
        const todayStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date()); // Formats as YYYY-MM-DD

        // 2. Check if a quote already exists for today
        const { data: existingQuote } = await supabase
            .from('daily_quotes')
            .select('id')
            .eq('date', todayStr)
            .single();

        if (existingQuote) {
            console.log("Quote already exists for today. Skipping generation.");
            return new Response(JSON.stringify({ status: 'skipped', message: 'Quote already exists' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        // 3. Optional: Fetch last 7 quotes to avoid repetition
        const { data: recentQuotes } = await supabase
            .from('daily_quotes')
            .select('text')
            .order('created_at', { ascending: false })
            .limit(7);

        let previousQuotesText = "";
        if (recentQuotes && recentQuotes.length > 0) {
            previousQuotesText = recentQuotes.map(q => `- "${q.text}"`).join('\n');
        }

        // 4. Prompt Gemini
        // We use JSON structured output to easily parse the text and source
        const prompt = `Lütfen Risale-i Nur Külliyatından yeni, orijinal, ilham verici ve kısa (maksimum 2 cümle) bir vecize paylaş.

Lütfen aşağıdaki kurallara kesinlikle uy:
1. Son zamanlarda paylaşılan şu vecizelerden FARKLI olmalı:
${previousQuotesText}
2. Tam ve anlamlı bir cümle olsun.
3. Külliyatta gerçekten geçen orijinal bir cümle olsun.
4. Yanıtı SADECE aşağıdaki JSON formatında döndür, başka hiçbir metin veya markdown işareti ekleme:

{
  "text": "...",
  "source": "..."
}`;

        console.log("Calling Gemini API...");
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        console.log("Raw Gemini Response:", responseText);

        // 5. Parse JSON
        // Sometimes the AI wraps JSON in markdown block like ```json
        let jsonStr = responseText.trim();
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.substring(7);
        }
        if (jsonStr.endsWith("```")) {
            jsonStr = jsonStr.substring(0, jsonStr.length - 3);
        }

        const quoteData = JSON.parse(jsonStr.trim());

        if (!quoteData.text || !quoteData.source) {
            throw new Error("Invalid format from AI");
        }

        // 6. Save to Database
        console.log("Inserting Quote:", quoteData);
        const { error: insertError } = await supabase
            .from('daily_quotes')
            .insert([{
                date: todayStr,
                text: quoteData.text,
                source: quoteData.source
            }]);

        if (insertError) {
            console.error("Database Insert Error:", insertError);
            throw new Error("Failed to save to database");
        }

        return new Response(JSON.stringify({
            status: 'success',
            date: todayStr,
            quote: quoteData
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error: any) {
        console.error("Edge Function Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
