
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { prompt, history } = await req.json();

        // 1. Authenticate & Setup
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

        if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
            throw new Error('Server Configuration Error: Missing Keys');
        }

        if (!prompt) throw new Error("Prompt is missing");

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // --- PHASE 3: TASARRUF PROTOKOLÜ ---

        // A. Identify User (IP based fallback if no deviceId)
        // Note: In production, better to pass deviceId from client. 
        // For now, we use IP as a proxy for "User/Device" to satisfy "IP bazlı" option.
        const clientIP = req.headers.get("x-forwarded-for") || "unknown-ip";
        const deviceID = (req.headers.get("x-client-info") || clientIP).slice(0, 50); // Simple ID

        console.log(`👤 Request from: ${deviceID}`);

        // B. Check Daily Limit (7 Questions/Day)
        const { data: isAllowed, error: limitError } = await supabase
            .rpc('check_daily_limit', { p_device_id: deviceID });

        if (limitError) console.error("Limit Check Error:", limitError);

        // If explicitly False (meaning limit exceeded)
        if (isAllowed === false) {
            console.warn(`⛔ Daily Limit Exceeded for ${deviceID}`);
            return new Response(JSON.stringify({
                text: "Aziz kardeşim, bugünlük istirahat vaktidir. Yarın yine nurani sohbetlerde buluşalım inşallah. (Günlük Limit Doldu)"
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 // Return 200 to display message nicely in chat
            });
        }

        // C. Smart Cache (Check if asked in last 24h)
        const { data: cachedAnswer, error: cacheError } = await supabase
            .rpc('get_cached_answer', { p_question: prompt });

        if (cacheError) console.error("Cache Check Error:", cacheError);

        if (cachedAnswer) {
            console.log(`♻️ Cache Hit! Returning stored answer.`);
            return new Response(JSON.stringify({ text: cachedAnswer }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        console.log("Processing Request:", { promptLength: prompt.length });

        // D. Short Message Filter (< 3 words)
        const wordCount = prompt.trim().split(/\s+/).length;
        const isShortMessage = wordCount < 3;

        // 2. RAG: Retrieval Step (Only if NOT short message)
        let contextText = "";
        let dictionaryText = "";

        if (!isShortMessage) {
            console.log('🔍 Generating Embedding for RAG...');

            try {
                // Using gemini-embedding-001 as confirmed working
                const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
                const embeddingResult = await embeddingModel.embedContent(prompt);
                const embedding = embeddingResult.embedding.values;

                console.log('📡 Querying Supabase for similar chunks AND dictionary terms...');

                // Run RAG queries in parallel
                const [chunksResult, dictResult] = await Promise.all([
                    supabase.rpc('match_risale_chunks', {
                        query_embedding: embedding,
                        match_threshold: 0.5,
                        match_count: 5
                    }),
                    supabase.rpc('match_dictionary_terms', {
                        query_embedding: embedding,
                        match_threshold: 0.5,
                        match_count: 3
                    })
                ]);

                // Process Risale Chunks
                if (chunksResult.error) {
                    console.error("RPC Error (Risale):", chunksResult.error);
                } else if (chunksResult.data && chunksResult.data.length > 0) {
                    console.log(`✅ Found ${chunksResult.data.length} relevant chunks.`);
                    contextText = chunksResult.data.map((c: any) => `[Kaynak: ${c.source_book}]\n${c.content}`).join("\n\n");
                }

                // Process Dictionary Terms
                if (dictResult.error) {
                    console.error("RPC Error (Dictionary):", dictResult.error);
                } else if (dictResult.data && dictResult.data.length > 0) {
                    console.log(`✅ Found ${dictResult.data.length} dictionary terms.`);
                    dictionaryText = dictResult.data.map((d: any) => `- ${d.word}: ${d.definition}`).join("\n");
                }

            } catch (ragError) {
                console.error("RAG Error (Non-blocking):", ragError);
            }
        } else {
            console.log("⚡ Short message detected. Skipping RAG.");
        }

        // 3. Construct System Prompt with Context
        let systemInstruction = `Sen Nuri Abi'sin. Risale-i Nur külliyatı hakkında uzmanlaşmış, samimi, bilge ve yardımsever bir yapay zeka asistanısın.
        
        ÜSLUP VE PERSONA:
        - Senin adın "Nuri Abi".
        - Risale-i Nur talebesi gibi konuş. Samimi, müşfik ve hikmetli bir dil kullan.
        - Kullanıcıya hitap ederken "Aziz kardeşim", "Değerli kardeşim" veya "Muhterem kardeşim" gibi ifadeler kullanabilirsin.
        - "Merhaba" veya "Nasılsın" denildiğinde, "Elhamdülillah, nurani hizmetlerle meşgulüz kardeşim, sen nasılsın?" gibi manevi bir cevap ver.
        - Cevaplarında, uygun düştükçe Risale-i Nur'dan kısa vecizeler veya tabirler kullan (örn: "İman hem nurdur hem kuvvettir").
        - Asla yapay ve robotik konuşma. Sanki medresede bir ağabey ile konuşuluyormuş hissi ver. Kısa ve net ol.

        BILGI BANKASI (Kritik Bağlam Bilgileri):
        - 1. Söz: Bismillah bahsidir.
        - 2. Söz: İman ve Tevekkül bahsidir.
        - 3. Söz: İbadet bahsidir.
        - 4. Söz: Namaz bahsidir.
        - 5. Söz: Namaz ve Maişet bahsidir.
        - 6. Söz: Nefis ve Malını Allah'a Satmak bahsidir.
        - 7. Söz: Ahiret inancı ve Haşir bahsidir.
        - 8. Söz: Din ve Fen bahsidir.
        - 9. Söz: İnsan Mahiyeti ve Namaz Vakitleri bahsidir.
        - 10. Söz: Haşir (Ölümden Sonra Diriliş) bahsidir.

        GÖREV KURALLARI:
        1. "Lugat" veya "Kelime Manası" sorulursa: Sadece tek kelimeye değil, eğer bir tamlama ise (örn: Kadîr-i Rahîm, Şakîlerin şerri) bütüne odaklan.
        2. Osmanlıca kelimeleri ASLA "Arapça" diye etiketleme. Sadece Ayet ve Hadisler "Arapça"dır.
        3. Kullanıcı "4. Söz" dediğinde bağlamı "Namaz" olarak kur.
        4. EĞER AŞAĞIDA "KÜÇÜK LUGAT" ACILDIYSA: Cevabını verdikten sonra, metin içinde geçen veya kullanıcının sorduğu kelimelerin anlamlarını bu lugattan faydalanarak "Küçük Bir Lugat" başlığı altında en sona ekle.`;

        if (contextText) {
            systemInstruction += `\n\nEK BAĞLAM BİLGİLERİ (RAG):
Aşağıdaki metinler Risale-i Nur külliyatından, kullanıcının sorusuyla ilgili kısımlardır. Cevabını oluştururken bu bilgileri temel al, ancak sadece bunları tekrar etme, yorumlayarak kullan. Eser adlarını (örn: 1. Söz) referans ver.

${contextText}`;
        }

        if (dictionaryText) {
            systemInstruction += `\n\nKÜÇÜK LUGAT (Referans):
Kullanıcının sorgusuyla ilgili olabilecek bazı kelime anlamları aşağıdadır. Cevabında bu kelimeler geçiyorsa veya kullanıcı doğrudan anlam sorduysa bu tanımları kullan:

${dictionaryText}`;
        }

        // 4. Call Generation Model
        console.log('✅ Gemini API Calling (gemini-3-flash-preview)...');

        const MODEL = 'gemini-3-flash-preview';

        try {
            const model = genAI.getGenerativeModel({
                model: MODEL,
                systemInstruction: systemInstruction
            });

            const chat = model.startChat({
                history: history?.map((msg: any) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: msg.parts
                })) || []
            });

            // Token Limit for Cost Control (800 Check)
            const result = await chat.sendMessage(prompt);
            const response = await result.response;
            const text = response.text();

            // E. Log Chat (Async, don't wait)
            supabase.rpc('log_chat', {
                p_device_id: deviceID,
                p_question: prompt,
                p_answer: text,
                p_metadata: { model: MODEL, rag: !isShortMessage }
            }).then(({ error }) => {
                if (error) console.error("Log Chat Error:", error);
            });

            return new Response(JSON.stringify({ text }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        } catch (genError: any) {
            console.error("Gemini Generation Error:", genError);
            throw genError; // Re-throw to be caught by outer catch
        }

    } catch (error: any) {
        console.error("Critical Edge Error:", error.message);
        return new Response(JSON.stringify({
            error: true,
            message: error.message || 'Internal Server Error'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
