import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Platform,
    Dimensions,
    Share,
    Clipboard,
    ActivityIndicator,
    StatusBar,
    Modal,
    ScrollView
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dictionaryDb, DictionaryEntry } from '@/services/dictionaryDb';
import { SCHEHERAZADE_BASE64 } from './ScheherazadeNewBase64';

// --- CSS CONFIGURATION (STRICT) ---
const getHtmlCss = () => `
<style>
  /* 1. FONTS */
  @font-face {
    font-family: 'ScheherazadeNew';
    src: url(data:font/ttf;base64,${SCHEHERAZADE_BASE64}) format("truetype");
    font-weight: normal;
    font-style: normal;
  }

  :root{ 
      --bg:#efe7d1; 
      --text:#111; 
      --arabic:#b3261e; 
      --base-size: 19px;
  }
  
  html,body{ margin:0; padding:0; background:var(--bg); color:var(--text); height: 100%; box-sizing: border-box; }
  
  /* DEFAULT PRESET: Readable MD/L */
  body {
    font-family: "Crimson Pro", "Times New Roman", serif;
    font-size: var(--base-size);
    line-height: 1.62;
    padding: 24px 20px 60px;
    -webkit-text-size-adjust: 100%;
    
    /* Selection Enabled */
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
  }

  /* OVERVIEW MODE */
  body.mode-overview {
    -webkit-user-select: none !important;
    user-select: none !important;
  }

  ::selection {
    background: rgba(189, 148, 90, 0.3);
    color: inherit;
  }

  /* 2. ARABIC BLOCKS (Normalized & Clamped) */
  .arabic-block { 
    font-family: "ScheherazadeNew", "Noto Naskh Arabic", serif; 
    color: var(--arabic); 
    text-align: center; 
    
    /* Clamp: Min 24px, Ideal relative to root, Max 32px */
    font-size: clamp(24px, 1.5rem, 32px); 
    
    line-height: 1.9; 
    padding: 12px 0; 
    margin: 16px 0;
    display: block; 
    direction: rtl;
    width: 100%;
  }

  /* 2.1 INLINE ARABIC SPANS */
  span.arabic, .arabic {
      font-family: "ScheherazadeNew", "Noto Naskh Arabic", serif;
      color: var(--arabic);
      font-size: 1.25em; /* Slightly larger than body */
      line-height: 1.4;
      white-space: normal !important;
      overflow-wrap: break-word !important;
  }
  
  /* 3. HEADINGS (Clamped & Normalized) */
  h1, h2, h3, 
  .heading-1, .heading-2, .heading-3 { 
    font-family: "UnifrakturCook","Germania One",serif; 
    text-align: center; 
    margin: 32px 0 16px; 
    line-height: 1.3; 
    color: #000;
  }

  /* Title Fix: H1 */
  h1, .heading-1 {
      /* Base * 1.25, Max 28px */
      font-size: clamp(22px, 1.3rem, 28px);
  }

  /* Subtitle: H2 */
  h2, .heading-2 {
      /* Base * 1.15, Max 24px */
      font-size: clamp(20px, 1.2rem, 24px);
  }

  /* Section: H3 */
  h3, .heading-3 {
      /* Base * 1.08, Max 20px */
      font-size: clamp(19px, 1.1rem, 21px);
  }
  
  /* 4. CONTENT BLOCKS */
  p, .paragraph { margin: 0 0 14px; }
  
  blockquote, .quote {
      margin: 16px 24px;
      font-style: italic;
      color: #444;
      border-left: 3px solid #ccc;
      padding-left: 12px;
  }

  hr.divider {
      border: 0;
      height: 1px;
      background: #ccc;
      margin: 40px auto;
      width: 60%;
  }

  /* 5. FOOTNOTES */
  .fn-marker {
    color: #1F6FEB; /* Mavi Yıldız */
    font-weight: bold;
    cursor: pointer;
    background: none;
    border: none;
    font-size: 0.9em;
    vertical-align: super;
    padding: 0 2px;
    text-decoration: none;
  }
</style>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
`;

// --- JS CONTROLLER ---
const INJECTED_JS = `
(function() {
    // STATE
    let scrollTimer;
    
    // 1. MESSAGING HELPER
    function send(type, payload={}) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
    }

    // 2. FONTS READY
    // Check if fonts are ready. If not, wait.
    function checkFonts() {
        document.fonts.ready.then(function() {
            send("FONTS_READY");
            // Small delay to ensure layout is final
            setTimeout(reportMetrics, 200);
        });
    }
    
    // If ScheherazadeNew specifically is loading, we might want to wait for it?
    // document.fonts.ready handles all pending fonts.
    checkFonts();
    
    // DEBUG: Check Font
    setTimeout(function() {
        const arEl = document.querySelector('.arabic-block');
        if(arEl) {
            const family = window.getComputedStyle(arEl).fontFamily;
            send("CONSOLE", { msg: "AR Font Active: " + family });
        }
    }, 2000);

    // 3. METRICS (Logic Pagination)
    function reportMetrics() {
        const scrollTop = window.scrollY;
        const viewportHeight = window.innerHeight;
        const contentHeight = document.body.scrollHeight;
        
        // Logical Page: 1 viewport = 1 page
        // Avoid division by zero
        if(viewportHeight < 10) return;

        const currentPage = Math.floor(scrollTop / viewportHeight) + 1;
        const totalPages = Math.ceil(contentHeight / viewportHeight);

        send("METRICS", { 
            scrollTop, 
            viewportHeight, 
            contentHeight, 
            currentPage, 
            totalPages 
        });
    }

    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(reportMetrics, 100); // Throttle 100ms
    });
    
    window.addEventListener('resize', reportMetrics);

    // 4. SELECTION LISTENER
    let selectionTimeout;
    function reportSelection() {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : "";
        
        send("SELECTION", { text });
    }

    document.addEventListener('selectionchange', function() {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(reportSelection, 250); 
    });
    
    // 5. MODE HANDLING
    window.setMode = function(mode) {
        if(mode === 'overview') {
            document.body.classList.add('mode-overview');
             window.getSelection().removeAllRanges();
        } else {
            document.body.classList.remove('mode-overview');
        }
    }

    // 6. AUTO-TAG ARABIC BLOCKS (PoC Heuristic)
    // HTML content doesn't have classes, so we detect them at runtime.
    function tagArabicBlocks() {
        const els = document.querySelectorAll('p, h3, h4'); 
        // Range includes basic Arabic, Supplement, Extended A
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

        els.forEach(el => {
            const text = el.textContent.trim();
            if (!text) return;
            
            // Heuristic: Count Arabic characters vs Total non-whitespace
            const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
            const totalChars = text.replace(/\s/g, '').length;
            
            if (totalChars > 0) {
                const ratio = arabicChars / totalChars;
                // If > 60% Arabic, treat as a block.
                // This handles purely Arabic lines (Ayats) while skipping Turkish lines with inline quotes.
                if (ratio > 0.6) {
                    el.classList.add('arabic-block');
                    el.dir = 'rtl'; // Ensure RTL
                }
            }
        });
    }

    // 7. FOOTNOTE LISTENER (Delegated)
    document.addEventListener('click', function(e) {
        // Handle Footnote Marker Click
        // Use closest to handle clicks on the star icon vs anchor
        const target = e.target;
        const marker = target.closest && target.closest('.fn-marker');
        
        if (marker) {
            e.preventDefault();
            e.stopPropagation();
            const id = marker.getAttribute('data-fn-id');
            
            // Retrieve content from hidden store
            const contentEl = document.querySelector('#footnotes [data-fn-id="' + id + '"]');
            const content = contentEl ? contentEl.innerHTML : "İçerik bulunamadı.";
            
            send("FOOTNOTE_CONTENT", { text: content });
        }
    });

    // Run immediately
    tagArabicBlocks();

})();
true;
`;

export const RisaleHtmlReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { assetPath, title } = route.params;
    const webViewRef = useRef<WebView>(null);

    // State
    const [fontsReady, setFontsReady] = useState(false);
    const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 });
    const [selectedText, setSelectedText] = useState("");

    // Dictionary State
    const [dictReq, setDictReq] = useState(false);
    const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
    const [dictCandidates, setDictCandidates] = useState<DictionaryEntry[]>([]);
    const [dictVisible, setDictVisible] = useState(false);
    const [searchedWord, setSearchedWord] = useState("");

    // Footnote State
    const [footnoteVisible, setFootnoteVisible] = useState(false);
    const [footnoteContent, setFootnoteContent] = useState("");

    useEffect(() => {
        dictionaryDb.init().catch(console.error);
    }, []);

    const injectCss = `
        var style = document.createElement('style');
        style.innerHTML = \`${getHtmlCss().replace(/<style>/g, '').replace(/<\/style>/g, '')}\`;
        document.head.appendChild(style);
        true;
    `;

    // Handlers
    const handleCandidatePress = (entry: DictionaryEntry) => {
        setDictEntry(entry);
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            switch (data.type) {
                case 'FONTS_READY':
                    // ... existing
                    console.log('WebView Fonts Ready');
                    setFontsReady(true);
                    break;
                case 'METRICS':
                    if (fontsReady) {
                        setPageInfo({
                            current: Math.max(1, data.currentPage || 1),
                            total: Math.max(1, data.totalPages || 1)
                        });
                    }
                    break;
                case 'SELECTION':
                    setSelectedText(data.text || "");
                    break;
                case 'CONSOLE':
                    console.log('[WebView]', data.msg);
                    break;
                case 'FOOTNOTE':
                    // JS sends {type:'FOOTNOTE', id:'1'}
                    // We need to fetch the content. The content is embedded in window.FOOTNOTES
                    // But wait, the JS doesn't send the text, it sends the ID.
                    // We can either:
                    // 1. Send the full text from JS (easier).
                    // 2. Query JS for the text (async).
                    // Let's update the script to send CONTENT instead of ID, or send ID and we look it up if we had strict data.
                    // Since we generated the HTML, we put window.FOOTNOTES in it.
                    // Let's assume the JS handler sends the content or we inject a helper to send content.
                    // UPDATE: The compile script sends: onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:'FOOTNOTE', id:'${id}'}))"
                    // The JS context has `window.FOOTNOTES`. So it's better if the JS looks it up before sending.
                    // I will inject a helper `sendFootnote(id)` in INJECTED_JS to do the lookup.
                    // But I can't change the HTML invalidation easily now.
                    // BETTER: Update INJECTED_JS to listen to a specific "requestFootnote" or just handle logic in JS if possible.
                    // SIMPLEST: The HTML onclick can be updated in the compiler.
                    // BUT for now, let's fetch it from the webview.

                    // Actually, if I modify INJECTED_JS I can add a helper `window.getFootnote(id)` matching the HTML interaction?
                    // The HTML is strictly: onclick="postMessage...".
                    // The WebView message is received here.
                    // We don't have the text here.
                    // I must execute JS to get the text.
                    webViewRef.current?.injectJavaScript(`
                        (function(){
                            const text = window.FOOTNOTES["${data.id}"];
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FOOTNOTE_CONTENT', text: text }));
                        })();
                        true;
                    `);
                    break;
                case 'FOOTNOTE_CONTENT':
                    setFootnoteContent(data.text);
                    setFootnoteVisible(true);
                    break;
            }
        } catch (e) { }
    };

    // ... existing handles ...

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* ... existing header & webview ... */}
            <WebView
                ref={webViewRef}
                source={{ uri: `file:///android_asset/${assetPath}` }}
                originWhitelist={['*']}
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scalesPageToFit={false}
                setBuiltInZoomControls={true}
                setDisplayZoomControls={false}
                onMessage={handleMessage}
                injectedJavaScriptBeforeContentLoaded={injectCss}
                injectedJavaScript={INJECTED_JS}
                style={{ flex: 1, backgroundColor: '#efe7d1' }}
            />

            {/* SELECTION ACTION BAR */}
            {selectedText.length > 0 && (
                <View style={styles.actionBar}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                        setSearchedWord(selectedText);
                        const query = selectedText.trim();

                        // Use flexible search to handle punctuation and normalization
                        dictionaryDb.searchFlexible(query).then(({ best, candidates }) => {
                            setDictCandidates(candidates);
                            setDictEntry(best); // If exact match found, show it directly
                            setDictVisible(true);
                        });
                    }}>
                        <Ionicons name="book" size={20} color="#fff" />
                        <Text style={styles.actionText}>Lugat</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                        Share.share({ message: selectedText });
                    }}>
                        <Ionicons name="share-social" size={20} color="#fff" />
                        <Text style={styles.actionText}>Paylaş</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                        Clipboard.setString(selectedText);
                        // Optional: Show toast
                        setSelectedText(""); // Auto deselect after copy? Maybe keep it.
                        webViewRef.current?.injectJavaScript(`window.getSelection().removeAllRanges(); true;`);
                    }}>
                        <Ionicons name="copy" size={20} color="#fff" />
                        <Text style={styles.actionText}>Kopyala</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.iconBtnSmall} onPress={() => {
                        setSelectedText("");
                        webViewRef.current?.injectJavaScript(`window.getSelection().removeAllRanges(); true;`);
                    }}>
                        <Ionicons name="close" size={22} color="#cbd5e1" />
                    </TouchableOpacity>
                </View>
            )}

            {/* FOOTNOTE MODAL (Bottom Sheet Style) */}
            <Modal visible={footnoteVisible} transparent animationType="slide" onRequestClose={() => setFootnoteVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFootnoteVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.candTitle}>Dipnot / Haşiye</Text>
                            <TouchableOpacity onPress={() => setFootnoteVisible(false)}>
                                <Ionicons name="close-circle" size={30} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.separator} />
                        <ScrollView style={{ maxHeight: 300 }}>
                            <Text style={styles.footNoteText}>{footnoteContent}</Text>
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* DICTIONARY MODAL */}
            <Modal visible={dictVisible} transparent animationType="fade" onRequestClose={() => setDictVisible(false)}>
                {/* ... existing dict modal content ... */}
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDictVisible(false)}>
                    <View style={styles.modalContent}>
                        {/* ... existing code ... */}
                        {/* 1. DETAIL VIEW */}
                        {dictEntry && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.dictWordOsm}>{dictEntry.word_osm}</Text>
                                        <Text style={styles.dictWordTr}>{dictEntry.word_tr}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setDictVisible(false)} style={{ padding: 4 }}>
                                        <Ionicons name="close-circle" size={32} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.separator} />
                                <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
                                    <Text style={styles.dictDef}>{dictEntry.definition}</Text>
                                </ScrollView>
                                {dictCandidates.length > 0 && (
                                    <TouchableOpacity
                                        style={{ marginTop: 12, padding: 8, alignItems: 'center' }}
                                        onPress={() => setDictEntry(null)} // Go back to list
                                    >
                                        <Text style={{ color: '#64748b', fontSize: 14 }}>Listeye Dön</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}

                        {/* 2. CANDIDATE LIST VIEW */}
                        {!dictEntry && dictCandidates.length > 0 && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={styles.candTitle}>Sonuçlar: "{searchedWord}"</Text>
                                        <Text style={styles.candSub}>Lütfen bir kelime seçin:</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setDictVisible(false)} style={{ padding: 4 }}>
                                        <Ionicons name="close-circle" size={32} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
                                    {dictCandidates.map((c, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={styles.candItem}
                                            onPress={() => handleCandidatePress(c)}
                                        >
                                            <Text style={styles.candOsm}>{c.word_osm}</Text>
                                            <Text style={styles.candTr}>{c.word_tr}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        {/* 3. NOT FOUND */}
                        {!dictEntry && dictCandidates.length === 0 && (
                            <View style={{ alignItems: 'center', padding: 20 }}>
                                <Ionicons name="alert-circle-outline" size={48} color="#cbd5e1" />
                                <Text style={{ fontSize: 16, color: '#64748b', marginTop: 12, textAlign: 'center' }}>
                                    Lügatta bulunamadı:{"\n"}"{searchedWord}"
                                </Text>
                                <TouchableOpacity
                                    style={{ marginTop: 20, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8 }}
                                    onPress={() => setDictVisible(false)}
                                >
                                    <Text style={{ color: '#334155' }}>Kapat</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', alignItems: 'center', height: 50,
        borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
        paddingHorizontal: 10
    },
    iconBtn: { padding: 8 },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1e293b', textAlign: 'center' },

    // Floating Page Indicator
    pageIndicator: {
        position: 'absolute',
        top: 70,
        right: 16,
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        pointerEvents: 'none',
        elevation: 4
    },
    pageText: { color: '#fff', fontSize: 13, fontWeight: 'bold', fontVariant: ['tabular-nums'] },

    // Action Bar
    actionBar: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingVertical: 10,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 999,
        alignItems: 'center'
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4 },
    iconBtnSmall: { paddingHorizontal: 10, paddingVertical: 4 },
    actionText: { color: '#fff', fontWeight: '600', marginLeft: 6, fontSize: 14 },
    divider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        minHeight: 320,
        maxHeight: '60%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    dictWordOsm: { fontSize: 36, color: '#b45309', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif', marginBottom: 4 },
    dictWordTr: { fontSize: 20, fontWeight: '700', color: '#1e293b', letterSpacing: 0.5 },
    separator: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 16 },
    dictDef: { fontSize: 17, color: '#334155', lineHeight: 28, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },

    // Candidates
    candTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    candSub: { fontSize: 14, color: '#64748b' },
    candItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    candOsm: { fontSize: 20, color: '#b45309', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif' },
    candTr: { fontSize: 16, color: '#334155', fontWeight: '500' },

    // Footnote
    footNoteText: { fontSize: 18, color: '#334155', lineHeight: 28, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }
});
