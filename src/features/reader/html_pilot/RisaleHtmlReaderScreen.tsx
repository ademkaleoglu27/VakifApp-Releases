import React, { useRef, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Platform,
    Share,
    Clipboard,
    ActivityIndicator,
    StatusBar,
    Modal,
    ScrollView,
    FlatList,
    Image,
    InteractionManager,
    Dimensions,
    useWindowDimensions,
    Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dictionaryDb, DictionaryEntry } from '@/services/dictionaryDb';
import { SCHEHERAZADE_BASE64 } from './ScheherazadeNewBase64';
import { HTML_BOOKS } from '@/features/reader/html/htmlManifest.generated';
import { getLugatSuggestions, LugatSuggestion } from '@/services/ai-assist';
import { TelemetryService } from '@/services/TelemetryService';
import { ENABLE_LUGAT_SUGGESTIONS } from '@/config/features';
import { checkAlias, LUGAT_ALIASES } from '@/services/lugat_aliases';
import { Linking } from 'react-native';
import { saveLastRead } from '@/services/readingProgress';

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
    line-height: 1.65;
    padding: 24px 20px 60px;
    -webkit-text-size-adjust: 100%;
    
    /* Selection Enabled - FORCE */
    -webkit-user-select: text !important;
    user-select: text !important;
    /* -webkit-touch-callout: default !important; */ /* Let native handle callouts for menu */
    /* cursor: auto !important; */
  }

  /* Specific elements text selection */
  p, div, span, h1, h2, h3, h4, b, strong, i, em, mark, .arabic-block, .arabic {
      -webkit-user-select: text !important;
      user-select: text !important;
  }
  
  /* FORCE ALL */
  * {
      -webkit-user-select: text !important;
      user-select: text !important;
  }

  ::selection {
    background: rgba(189, 148, 90, 0.4);
    color: inherit;
  }

  /* 2. ARABIC BLOCKS (Normalized & Clamped) */
  .arabic-block { 
    font-family: "ScheherazadeNew", "Noto Naskh Arabic", serif; 
    color: var(--arabic); 
    text-align: center; 
    
    /* Clamp: Min 24px, Ideal relative to root, Max 32px */
    font-size: clamp(24px, 1.5rem, 32px); 
    
    line-height: 2.0; 
    padding: 16px 8px;
    margin: 16px 0;
    display: block; 
    direction: rtl;
    width: 100%;
    
    /* FIX: Revert to isolate for blocks (safer for layout), use embed for spans */
    unicode-bidi: isolate;
  }

  /* 2.1 INLINE ARABIC SPANS */
  span.arabic, .arabic {
      font-family: "ScheherazadeNew", "Noto Naskh Arabic", serif;
      color: var(--arabic);
      font-size: 1.25em; 
      line-height: 1.5;
      white-space: normal !important;
      overflow-wrap: break-word !important;
      
      /* FIX: 'embed' maintains RTL but allows selection to flow through */
      unicode-bidi: embed; 
      padding: 2px 0;
  }
  
  /* FIX: Ensure bold/italic are explicitly selectable and don't trap selection */
  b, strong, i, em, mark {
      -webkit-user-select: text;
      user-select: text;
      cursor: auto;
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
// --- JS CONTROLLER ---
const INJECTED_JS = `
(function() {
    // STATE
    let scrollTimer;
    let isSelectionInitialized = false;
    let selectionTimeout;
    
    // 1. MESSAGING HELPER
    function send(type, payload={}) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
    }

    // 2. FONTS READY
    function checkFonts() {
        document.fonts.ready.then(function() {
            send("FONTS_READY");
            setTimeout(reportMetrics, 200);
        });
    }
    checkFonts();
    
    // DEBUG: Check Font
    setTimeout(function() {
        const arEl = document.querySelector('.arabic-block');
        if(arEl) {
            const family = window.getComputedStyle(arEl).fontFamily;
            send("CONSOLE", { msg: "AR Font Active: " + family });
        }
    }, 2000);

    // 3. METRICS
    function reportMetrics() {
        const scrollTop = window.scrollY;
        const viewportHeight = window.innerHeight;
        const contentHeight = document.body.scrollHeight;
        
        if(viewportHeight < 10) return;

        const currentPage = Math.floor(scrollTop / viewportHeight) + 1;
        const totalPages = Math.ceil(contentHeight / viewportHeight);
        const isAtEnd = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 50);

        send("METRICS", { 
            scrollTop, 
            viewportHeight, 
            contentHeight, 
            currentPage, 
            totalPages,
            isAtEnd 
        });
    }

    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(reportMetrics, 100); 
    });
    
    window.addEventListener('resize', reportMetrics);

    // 4. SELECTION MANAGER (ROBUST)
    function handleSelectionChange() {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(() => {
            const sel = window.getSelection();
            const text = sel ? sel.toString().trim() : "";
            send("SELECTION", { text });
        }, 300); // Increased delay for stability
    }

    function initSelection() {
        if (isSelectionInitialized) return;
        
        // Clean up old listeners if any
        document.removeEventListener('selectionchange', handleSelectionChange);
        
        // Add listener
        document.addEventListener('selectionchange', handleSelectionChange);
        
        isSelectionInitialized = true;
    }

    // SELECTION RESET API (Called from Native)
    window.resetSelectionAPI = function() {
        // ANDROID İÇİN DAHA UZUN DELAY
        setTimeout(() => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                selection.removeAllRanges();
            }
            send("CONSOLE", { msg: "Selection cleared after 800ms delay" });
        }, 800);  // 500ms -> 800ms (Android İçin)
    };

    // Auto-init on load
    initSelection();

    // Re-init on visibility change (App background/foreground)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // Apply clearance only when going to background
            // Delay to allow menu close
            setTimeout(() => {
                const sel = window.getSelection();
                if (sel) sel.removeAllRanges();
            }, 200);
        }
    });

    // 5. AUTO-TAG ARABIC BLOCKS
    function tagArabicBlocks() {
        const els = document.querySelectorAll('p, h3, h4'); 
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

        els.forEach(el => {
            const text = el.textContent.trim();
            if (!text) return;
            
            const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
            const totalChars = text.replace(/\s/g, '').length;
            
            if (totalChars > 0) {
                const ratio = arabicChars / totalChars;
                if (ratio > 0.6) {
                    el.classList.add('arabic-block');
                    el.dir = 'rtl'; 
                }
            }
        });
    }
    tagArabicBlocks();

    // 6. FOOTNOTE LISTENER (Simple Click)
    document.addEventListener('click', function(e) {
        const target = e.target;
        const marker = target.closest && target.closest('.fn-marker');
        
        if (marker) {
            const id = marker.getAttribute('data-fn-id');
            send("FOOTNOTE", { id });
        }
    });

})();
true;
`;

export const RisaleHtmlReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { assetPath, title, bookId, chapterId } = route.params;
    const webViewRef = useRef<WebView>(null);
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const insets = useSafeAreaInsets();

    // State
    const [fontsReady, setFontsReady] = useState(false);
    const [pageInfo, setPageInfo] = useState({ current: 1, total: 1, isAtEnd: false });

    // Phase 4: Unlock Orientation
    useFocusEffect(
        useCallback(() => {
            ScreenOrientation.unlockAsync();
            return () => {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            };
        }, [])
    );

    // Font Size State
    const DEFAULT_FONT_SIZE = 19;
    const MIN_FONT_SIZE = 14;
    const MAX_FONT_SIZE = 28;
    const FONT_STEP = 2;
    const FONT_SIZE_KEY = 'reader_font_size';
    const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

    // --- SELECTION RESET ON FOCUS ---
    useFocusEffect(
        useCallback(() => {
            if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                   if (window.resetSelectionAPI) { 
                       window.resetSelectionAPI(); 
                   }
                   true;
               `);
            }
        }, [])
    );

    // Load saved font size preference
    useEffect(() => {
        AsyncStorage.getItem(FONT_SIZE_KEY).then(val => {
            if (val) {
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed) && parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
                    setFontSize(parsed);
                }
            }
        }).catch(() => { });
    }, []);

    // Inject font size into WebView whenever it changes
    useEffect(() => {
        if (webViewRef.current && fontsReady) {
            webViewRef.current.injectJavaScript(
                `document.documentElement.style.setProperty('--base-size', '${fontSize}px'); true;`
            );
        }
    }, [fontSize, fontsReady]);

    const changeFontSize = (delta: number) => {
        setFontSize(prev => {
            const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, prev + delta));
            AsyncStorage.setItem(FONT_SIZE_KEY, String(next)).catch(() => { });
            return next;
        });
    };

    const [selectedText, setSelectedText] = useState("");

    // Dictionary State
    const [dictReq, setDictReq] = useState(false);
    const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
    const [dictCandidates, setDictCandidates] = useState<DictionaryEntry[]>([]);
    const [dictVisible, setDictVisible] = useState(false);
    const [searchedWord, setSearchedWord] = useState("");
    const [localSuggestions, setLocalSuggestions] = useState<LugatSuggestion[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);

    // TOC Modal State
    const [tocVisible, setTocVisible] = useState(false);
    const currentBook = bookId ? HTML_BOOKS[bookId] : null;

    // Footnote State
    const [footnoteVisible, setFootnoteVisible] = useState(false);
    const [footnoteContent, setFootnoteContent] = useState("");

    // AI Modal State
    const [aiModalVisible, setAiModalVisible] = useState(false);

    useEffect(() => {
        dictionaryDb.init().catch(console.error);
        // Save reading progress
        if (bookId && chapterId) {
            const idx = currentBook?.chapters.findIndex(c => c.id === chapterId) ?? 0;
            saveLastRead(bookId, chapterId, idx).catch(console.warn);
        }
    }, [chapterId]);

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
                case 'LOG':
                    console.log('[WebView Log]', data.message);
                    break;
                case 'FONTS_READY':
                    console.log('WebView Fonts Ready');
                    setFontsReady(true);
                    break;
                case 'METRICS':
                    // Calculate estimated real book page
                    const viewportH = data.viewportHeight || Dimensions.get('window').height;
                    const scrollTop = data.scrollTop || 0;
                    const contentH = data.contentHeight || viewportH;
                    const scrollableHeight = Math.max(1, contentH - viewportH);
                    const scrollPercent = scrollableHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollableHeight)) : 0;

                    setPageInfo({
                        current: scrollPercent,  // store as 0-1 ratio
                        total: data.totalPages || 1,
                        isAtEnd: !!data.isAtEnd
                    });
                    break;
                case 'SELECTION':
                    setSelectedText(data.text || "");
                    break;
                case 'CONSOLE':
                    console.log('[WebView]', data.msg);
                    break;
                case 'FOOTNOTE':
                    // Fetch content by ID
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

    // NEXT SECTION LOGIC
    const getNextChapter = () => {
        if (!bookId || !chapterId) return null;
        const book = HTML_BOOKS[bookId];
        if (!book) return null;
        const index = book.chapters.findIndex(c => c.id === chapterId);
        if (index === -1 || index === book.chapters.length - 1) return null;
        return book.chapters[index + 1];
    };

    const nextChapter = getNextChapter();
    // Use isAtEnd flag for reliable detection (with buffer)
    const showNextButton = nextChapter && pageInfo.isAtEnd;

    // Real page estimation
    const currentChapter = currentBook?.chapters.find(c => c.id === chapterId);
    const bookTotalPages = currentBook ? (() => {
        const last = currentBook.chapters[currentBook.chapters.length - 1];
        return last.startPage + last.pageCount - 1;
    })() : 0;

    const handleNextSection = () => {
        if (nextChapter) {
            navigation.replace('RisaleHtmlReader', {
                assetPath: nextChapter.assetPath,
                title: nextChapter.title,
                bookId: bookId,
                chapterId: nextChapter.id
            });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header with Back + Title + Font Controls + TOC */}
            {!isLandscape && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#efe7d1', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#d4cbb5' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
                        <Ionicons name="arrow-back" size={22} color="#334155" />
                    </TouchableOpacity>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b', marginHorizontal: 10 }}>{title}</Text>

                    {/* Font Size Controls */}
                    <TouchableOpacity
                        onPress={() => changeFontSize(-FONT_STEP)}
                        disabled={fontSize <= MIN_FONT_SIZE}
                        style={{ padding: 6, opacity: fontSize <= MIN_FONT_SIZE ? 0.3 : 1 }}
                    >
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#334155' }}>A⁻</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 11, color: '#94a3b8', minWidth: 24, textAlign: 'center' }}>{fontSize}</Text>
                    <TouchableOpacity
                        onPress={() => changeFontSize(FONT_STEP)}
                        disabled={fontSize >= MAX_FONT_SIZE}
                        style={{ padding: 6, opacity: fontSize >= MAX_FONT_SIZE ? 0.3 : 1 }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#334155' }}>A⁺</Text>
                    </TouchableOpacity>

                    {currentBook && (
                        <TouchableOpacity onPress={() => setTocVisible(true)} style={{ padding: 6, marginLeft: 4 }}>
                            <Ionicons name="list" size={22} color="#334155" />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* TOC Modal */}
            <Modal visible={tocVisible} animationType="slide" transparent onRequestClose={() => setTocVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingBottom: 30 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1e293b' }}>İçindekiler</Text>
                            <TouchableOpacity onPress={() => setTocVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={currentBook?.chapters || []}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item, index }) => {
                                const isActive = item.id === chapterId;
                                return (
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 20, backgroundColor: isActive ? '#f0f9ff' : '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                                        onPress={() => {
                                            setTocVisible(false);
                                            if (!isActive) {
                                                navigation.replace('RisaleHtmlReader', {
                                                    assetPath: item.assetPath,
                                                    title: item.title,
                                                    bookId: bookId,
                                                    chapterId: item.id
                                                });
                                            }
                                        }}
                                    >
                                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isActive ? '#3b82f6' : '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: isActive ? '#fff' : '#64748b' }}>{index + 1}</Text>
                                        </View>
                                        <Text style={{ flex: 1, fontSize: 14, color: isActive ? '#1d4ed8' : '#334155', fontWeight: isActive ? '700' : '400' }}>{item.title}</Text>
                                        {isActive && <Ionicons name="radio-button-on" size={16} color="#3b82f6" />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>

            {/* CARD READER WRAPPER -> Reverted to standard */}
            <View style={{ flex: 1 }}>
                <WebView
                    ref={webViewRef}
                    source={{ uri: assetPath.startsWith('file:') ? assetPath : `file:///android_asset/${assetPath}` }}
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
                    webviewDebuggingEnabled={true}
                />
            </View>

            {/* Real Page Indicator */}
            {currentChapter && (
                <View style={styles.pageIndicator}>
                    <Text style={styles.pageText}>
                        {`~Sayfa ${currentChapter.startPage + Math.round(pageInfo.current * Math.max(0, currentChapter.pageCount - 1))} / ${bookTotalPages}`}
                    </Text>
                </View>
            )}

            {/* NEXT SECTION BUTTON */}
            {showNextButton && (
                <TouchableOpacity style={styles.nextSectionBtn} onPress={handleNextSection}>
                    <Text style={styles.nextSectionText}>Sonraki Bölüm</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Floating Back Button for Landscape (Moved to end for Z-Index Safety) */}
            {isLandscape && (
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        left: 10,
                        top: Math.max(10, insets.top + 10),
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 999,
                        elevation: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.3)',
                    }}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                </TouchableOpacity>
            )}

            {/* SELECTION ACTION BAR */}
            {selectedText.length > 0 && (
                <View style={styles.actionBar}>
                    <TouchableOpacity style={styles.actionBtn} onPress={async () => {
                        setSearchedWord(selectedText);
                        let query = selectedText.trim();
                        setLocalSuggestions([]);
                        setSuggestionsLoading(false);

                        // 1. CHECK ALIAS (Mapping Katmanı)
                        const alias = checkAlias(query);
                        if (alias) {
                            console.log(`[Lugat] Alias found: "${query}" -> "${alias}"`);
                            query = alias;
                        }

                        // Use flexible search to handle punctuation and normalization
                        console.log('[Lugat] Searching for:', query);
                        const { best, candidates } = await dictionaryDb.searchFlexible(query);
                        console.log('[Lugat] Search Result:', { best, candidateCount: candidates.length });

                        setDictCandidates(candidates);
                        setDictEntry(best);
                        setDictVisible(true);

                        // Telemetry
                        if (best) {
                            TelemetryService.log({ type: 'lookup_suggestion_shown', word: query, suggestionCount: 1 });
                        } else if (candidates.length > 0) {
                            TelemetryService.log({ type: 'lookup_suggestion_shown', word: query, suggestionCount: candidates.length });
                        } else {
                            TelemetryService.logLookupMiss(query, bookId);

                            // Load local suggestions if feature enabled
                            if (ENABLE_LUGAT_SUGGESTIONS) {
                                setSuggestionsLoading(true);
                                try {
                                    const suggestions = await getLugatSuggestions(query, 6);
                                    setLocalSuggestions(suggestions);
                                    if (suggestions.length > 0) {
                                        TelemetryService.log({ type: 'lookup_suggestion_shown', word: query, suggestionCount: suggestions.length });
                                    }
                                } catch (err) {
                                    console.error('[Lugat] Suggestion error:', err);
                                } finally {
                                    setSuggestionsLoading(false);
                                }
                            }
                        }
                    }}>
                        <Ionicons name="book" size={20} color="#fff" />
                        <Text style={styles.actionText}>Lugat</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                        setAiModalVisible(true);
                    }}>
                        <Ionicons name="sparkles" size={20} color="#fff" />
                        <Text style={styles.actionText}>Nuri Abi</Text>
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

                        // Show toast feedback
                        Alert.alert("✅", "Metin kopyalandı", [{ text: "Tamam" }]);

                        // DAHA UZUN DELAY
                        setTimeout(() => {
                            setSelectedText("");
                            webViewRef.current?.injectJavaScript(`window.resetSelectionAPI(); true;`);
                        }, 500); // 300ms -> 500ms
                    }}>
                        <Ionicons name="copy" size={20} color="#fff" />
                        <Text style={styles.actionText}>Kopyala</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.iconBtnSmall} onPress={() => {
                        setSelectedText("");
                        // Delay clearing slightly
                        setTimeout(() => {
                            webViewRef.current?.injectJavaScript(`window.resetSelectionAPI(); true;`);
                        }, 200); // 100ms -> 200ms
                    }}>
                        <Ionicons name="close" size={22} color="#cbd5e1" />
                    </TouchableOpacity>
                </View>
            )}

            {/* AI OPTIONS MODAL */}
            <Modal visible={aiModalVisible} transparent animationType="slide" onRequestClose={() => setAiModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAiModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="sparkles" size={24} color="#7c3aed" style={{ marginRight: 8 }} />
                                <Text style={styles.candTitle}>Nuri Abi'ye Sor</Text>
                            </View>
                            <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                                <Ionicons name="close-circle" size={30} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: '#64748b', marginBottom: 16, fontSize: 13 }}>
                            Seçili metinle ilgili ne yapmak istersiniz?
                        </Text>

                        <View style={styles.separator} />

                        <TouchableOpacity style={styles.aiOptionBtn} onPress={() => {
                            const query = `Şu metni analiz et. \n1. Eğer metin BIR AYET veya HADIS ise (Tamamen Arapça): Önce **TAM MEALİNİ** yaz. Sonra (varsa) içindeki zor kelimeleri listele.\n2. Eğer metin Osmanlıca/Türkçe bir ibare veya tamlama ise (Örn: Kadîr-i Rahîm, Şakîlerin şerrinden): BÜTÜN olarak manasını açıkla ("Kadîr-i Rahîm: Hem kudretli hem merhametli..." gibi). Sadece kelime kelime bölme.\n\nUYARI: Osmanlıca kelimeler Arapça değildir, "Metin Arapça" deme.\n\nKonuşma dili kullanma, direkt cevabı ver.\n\nMetin:\n"${selectedText}"`;
                            setAiModalVisible(false);
                            setSelectedText("");
                            // FIX: Delay ekle
                            setTimeout(() => {
                                webViewRef.current?.injectJavaScript(`window.resetSelectionAPI(); true;`);
                            }, 100);
                            navigation.navigate('GeminiChat', { initialQuery: query });
                        }}>
                            <View style={[styles.aiIconBox, { backgroundColor: '#e0f2fe' }]}>
                                <Ionicons name="book-outline" size={24} color="#0284c7" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.aiOptionTitle}>Kelime Manaları</Text>
                                <Text style={styles.aiOptionDesc}>Seçili metindeki bilinmeyen kelimeleri açıkla</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.aiOptionBtn} onPress={() => {
                            const query = `Bu metinle ilgili ayet ve hadis bağlantıları nelerdir? \nEğer metin bizzat ayet/hadis ise kaynağını ve mealini göster. \nEğer Risale-i Nur metni ise, dayandığı ayet/hadisleri açıkla.\n\nMetin:\n"${selectedText}"`;
                            setAiModalVisible(false);
                            setSelectedText("");
                            // FIX: Delay ekle
                            setTimeout(() => {
                                webViewRef.current?.injectJavaScript(`window.resetSelectionAPI(); true;`);
                            }, 100);
                            navigation.navigate('GeminiChat', { initialQuery: query });
                        }}>
                            <View style={[styles.aiIconBox, { backgroundColor: '#dcfce7' }]}>
                                <Ionicons name="leaf-outline" size={24} color="#16a34a" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.aiOptionTitle}>Ayet & Hadis Bağlantısı</Text>
                                <Text style={styles.aiOptionDesc}>İlgili ayet ve hadis kaynaklarını göster</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.aiOptionBtn} onPress={() => {
                            const query = `Şu metni maddeler halinde özetleyip, Risale-i Nur külliyatındaki yeri bağlamında izah eder misin:\n\n"${selectedText}"`;
                            setAiModalVisible(false);
                            setSelectedText("");
                            // FIX: Delay ekle
                            setTimeout(() => {
                                webViewRef.current?.injectJavaScript(`window.resetSelectionAPI(); true;`);
                            }, 100);
                            navigation.navigate('GeminiChat', { initialQuery: query });
                        }}>
                            <View style={[styles.aiIconBox, { backgroundColor: '#fef3c7' }]}>
                                <Ionicons name="list-outline" size={24} color="#d97706" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.aiOptionTitle}>Özetle ve İzah Et</Text>
                                <Text style={styles.aiOptionDesc}>Metni özetle ve ana fikrini açıkla</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.aiOptionBtn} onPress={() => {
                            const query = `Şu metinden çalışma veya tefekkür soruları çıkar:\n\n"${selectedText}"`;
                            setAiModalVisible(false);
                            setSelectedText("");
                            // FIX: Delay ekle
                            setTimeout(() => {
                                webViewRef.current?.injectJavaScript(`window.resetSelectionAPI(); true;`);
                            }, 100);
                            navigation.navigate('GeminiChat', { initialQuery: query });
                        }}>
                            <View style={[styles.aiIconBox, { backgroundColor: '#f5f3ff' }]}>
                                <Ionicons name="chatbubbles-outline" size={24} color="#7c3aed" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.aiOptionTitle}>Sohbet / Ders</Text>
                                <Text style={styles.aiOptionDesc}>Konu üzerine interaktif sohbet</Text>
                            </View>
                        </TouchableOpacity>

                    </View>
                </TouchableOpacity>
            </Modal>

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
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
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

                        {/* 3. NOT FOUND + LOCAL SUGGESTIONS */}
                        {!dictEntry && dictCandidates.length === 0 && (
                            <View style={{ padding: 16 }}>
                                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                                    <Ionicons name="alert-circle-outline" size={40} color="#cbd5e1" />
                                    <Text style={{ fontSize: 15, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
                                        Lügatta bulunamadı: "{searchedWord}"
                                    </Text>
                                </View>

                                {/* Loading indicator */}
                                {suggestionsLoading && (
                                    <View style={{ alignItems: 'center', padding: 12 }}>
                                        <ActivityIndicator size="small" color="#6366f1" />
                                        <Text style={{ marginTop: 6, color: '#94a3b8', fontSize: 13 }}>Öneriler aranıyor...</Text>
                                    </View>
                                )}

                                {/* Local Suggestions */}
                                {!suggestionsLoading && localSuggestions.length > 0 && (
                                    <View>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 10 }}>Öneriler:</Text>
                                        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator>
                                            {localSuggestions.map((s, i) => (
                                                <TouchableOpacity
                                                    key={s.entry.id || i}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        paddingVertical: 10,
                                                        borderBottomWidth: i < localSuggestions.length - 1 ? 1 : 0,
                                                        borderBottomColor: '#f1f5f9'
                                                    }}
                                                    onPress={() => {
                                                        TelemetryService.log({ type: 'lookup_suggestion_selected', word: searchedWord, selectedWord: s.entry.word_tr });
                                                        setDictEntry(s.entry);
                                                        setLocalSuggestions([]);
                                                    }}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ fontSize: 18, color: '#b45309' }}>{s.entry.word_osm}</Text>
                                                        <Text style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>{s.entry.word_tr}</Text>
                                                    </View>
                                                    <View style={{
                                                        backgroundColor: s.matchType === 'fuzzy' ? '#fef3c7' : s.matchType === 'alias' ? '#e0f2fe' : '#f0fdf4',
                                                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12
                                                    }}>
                                                        <Text style={{ fontSize: 10, color: s.matchType === 'fuzzy' ? '#92400e' : s.matchType === 'alias' ? '#0284c7' : '#16a34a', fontWeight: '600' }}>
                                                            {s.matchType === 'normalized' ? 'normalize' : s.matchType === 'variant' ? 'varyant' : s.matchType === 'alias' ? 'ilişkili' : s.matchType === 'fuzzy' ? 'yakın' : 'eşleşme'}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* No suggestions found */}
                                {!suggestionsLoading && localSuggestions.length === 0 && (
                                    <View>
                                        <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
                                            Öneri bulunamadı.
                                        </Text>

                                        {/* Google Search Button (Phase 1) */}
                                        <TouchableOpacity
                                            style={{
                                                marginTop: 12,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#fff',
                                                borderWidth: 1,
                                                borderColor: '#e2e8f0',
                                                padding: 10,
                                                borderRadius: 8
                                            }}
                                            onPress={async () => {
                                                try {
                                                    const url = `https://www.google.com/search?q=${encodeURIComponent(searchedWord + " nedir risale")}`;
                                                    await Linking.openURL(url);
                                                } catch (e) {
                                                    console.warn('[Lugat] Could not open browser:', e);
                                                }
                                            }}
                                        >
                                            <Ionicons name="logo-google" size={18} color="#475569" style={{ marginRight: 8 }} />
                                            <Text style={{ color: '#475569', fontWeight: '500' }}>Google'da Ara</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={{ marginTop: 16, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, alignItems: 'center' }}
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
    container: {
        flex: 1,
        backgroundColor: '#0B0F14' // Dark Reference BG
    },
    // Card Wrapper for WebView
    webViewWrapper: {
        flex: 1,
        marginVertical: 10,
        marginHorizontal: 12,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#efe7d1', // Match paper color
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
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
    footNoteText: { fontSize: 18, color: '#334155', lineHeight: 28, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },

    // Page Info Bubble (Reading Mode)
    // pageLabel: { marginTop: 8, color: '#000', fontSize: 12, fontWeight: 'bold' }, // Moved to PageThumbnail footer

    // Next Section Button
    nextSectionBtn: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: '#1e293b',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 24,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        zIndex: 1000
    },
    nextSectionText: { color: '#fff', fontWeight: 'bold', marginRight: 8, fontSize: 14 },
    // AI Modal Styles
    aiOptionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    aiIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    aiOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 2,
    },
    aiOptionDesc: {
        fontSize: 12,
        color: '#64748b',
    }
});
