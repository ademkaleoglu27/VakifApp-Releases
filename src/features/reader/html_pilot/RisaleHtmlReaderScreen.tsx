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
import { ContentPackResolver } from '@/services/ContentPackResolver';
import { TelemetryService } from '@/services/TelemetryService';
import { ENABLE_LUGAT_SUGGESTIONS } from '@/config/features';
import { checkAlias, LUGAT_ALIASES } from '@/services/lugat_aliases';
import { Linking } from 'react-native';
import { saveLastRead } from '@/services/readingProgress';

const THEME_OPTIONS = [
    { id: 'classic', label: 'Klasik', bg: '#efe7d1', text: '#111' },
    { id: 'light', label: 'Aydınlık', bg: '#ffffff', text: '#000' },
    { id: 'sepia', label: 'Sepya', bg: '#f4ecd8', text: '#3E2723' },
    { id: 'dark', label: 'Gece', bg: '#121212', text: '#e0e0e0' },
];

const FONT_OPTIONS = [
    { id: '"Crimson Pro", "Times New Roman", serif', label: 'Klasik' },
    { id: 'System, Roboto, Arial, sans-serif', label: 'Modern' },
    { id: 'Georgia, serif', label: 'Kitap' },
];

const ALIGN_OPTIONS = [
    { id: 'left', label: 'Sola Yasla' },
    { id: 'justify', label: 'İki Yana' },
];

const LINE_HEIGHT_OPTIONS = [
    { id: '1.5', label: 'Sıkı' },
    { id: '1.65', label: 'Normal' },
    { id: '1.9', label: 'Geniş' },
];

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
      --arabic:#8b0000; 
      --base-size: 19px;
      --font-family: "Crimson Pro", "Times New Roman", serif;
      --line-height: 1.65;
      --text-align: left;
  }
  
  html,body{ margin:0; padding:0; background:var(--bg); color:var(--text); height: 100%; box-sizing: border-box; }
  
  /* DEFAULT PRESET: Readable MD/L */
  body {
    font-family: var(--font-family);
    font-size: var(--base-size);
    line-height: var(--line-height);
    text-align: var(--text-align);
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
    font-family: "ScheherazadeNew", "Noto Naskh Arabic", serif !important; 
    color: var(--arabic) !important; 
    text-align: center !important; 
    
    /* Clamp: Min 24px, Ideal relative to root, Max 32px */
    font-size: clamp(24px, 1.5rem, 32px) !important; 
    
    line-height: 2.0 !important; 
    padding: 16px 8px !important;
    margin: 16px 0 !important;
    display: block !important; 
    direction: rtl !important;
    width: 100% !important;
    background-color: transparent !important;
    
    /* FIX: Revert to isolate for blocks (safer for layout), use embed for spans */
    unicode-bidi: isolate !important;
  }

  /* 2.1 INLINE ARABIC SPANS */
  span.arabic, .arabic {
      font-family: "ScheherazadeNew", "Noto Naskh Arabic", serif !important;
      color: var(--arabic) !important;
      font-size: 1.25em !important; 
      line-height: inherit !important; 
      white-space: normal !important;
      overflow-wrap: break-word !important;
      
      /* Satır aralığını bozmaması için sıfırlamalar */
      padding: 0 !important;
      margin: 0 !important;
      background-color: transparent !important;
      
      /* FIX: 'embed' maintains RTL but allows selection to flow through */
      unicode-bidi: embed !important; 
  }
  
  /* FIX: Ensure bold/italic are explicitly selectable and don't trap selection */
  b, strong, i, em, mark {
      -webkit-user-select: text;
      user-select: text;
      cursor: auto;
  }
  
  /* 3. HEADINGS (Clamped & Normalized) */
  h1, h2, h3, h4, h5, h6,
  .heading-1, .heading-2, .heading-3, .heading-4 { 
    font-family: "UnifrakturCook","Germania One",serif; 
    text-align: center; 
    margin: 32px 0 16px; 
    line-height: 1.3; 
    color: var(--text);
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
const getInjectedJs = (bookId?: string) => `
(function() {
    const CURRENT_BOOK = "${bookId || ''}";
    
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
        if (CURRENT_BOOK === 'risale.sozler@diyanet.tr' || CURRENT_BOOK.includes('sozler')) {
            // FIX 1: Tamamen veya büyük oranda Arapça olan paragrafları 'arabic-block' yap (Ortalama ve büyük boyut)
            const blockEls = document.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6'); 
            blockEls.forEach(el => {
                const text = el.textContent.trim();
                if (!text) return;
                const arabicChars = (text.match(/[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF]/g) || []).length;
                const totalChars = text.replace(/\\s/g, '').length;
                if (totalChars > 0 && arabicChars > 0 && (arabicChars / totalChars > 0.6)) {
                    el.classList.add('arabic-block');
                    el.dir = 'rtl';
                }
            });

            // FIX 2: Sual/Elcevap gibi Mavi Başlıkları temizle, Arapça metinlerdeki bozuk satır-içi fontları sil
            const coloredSpans = document.querySelectorAll('span[style*="#0070c0"], span[style*="#002060"], span[style*="color: rgb(0, 112, 192)"], span[style*="color: rgb(0, 32, 96)"]');
            coloredSpans.forEach(span => {
                span.style.color = '';
                
                const isArabicBlock = span.closest('.arabic-block');
                const text = span.textContent.trim();
                const arabicChars = (text.match(/[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF]/g) || []).length;
                const isArabicText = text.length > 0 && (arabicChars / text.replace(/\\s/g, '').length) > 0.5;

                if (!isArabicBlock && !isArabicText) {
                    span.style.fontWeight = 'bold'; // Sadece Türkçe başlıklara (Sual vs) kalınlık ekle
                } else {
                    span.style.fontSize = ''; // Aşırı büyük gelen font-size'ı sıfırla
                    span.style.fontFamily = ''; // Yanlış font family'i sıfırla
                }
            });

            // Genel temizlik: Tüm arabic-block içindeki spanların inline bozuk değerlerini temizle ki custom CSS (kırmızı vb) işlesin
            document.querySelectorAll('.arabic-block span').forEach(span => {
                if (span.style.color) span.style.color = '';
                if (span.style.fontSize) span.style.fontSize = '';
                if (span.style.fontFamily) span.style.fontFamily = '';
            });

            // FIX 3: Metin Düğümlerini Tarayan Gelişmiş Arapça Algoritması (Satır içi ufak ayet parçaları için)
            const arabicRegex = /([\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\s]+)/g;
            
            function processNode(node) {
                if (node.nodeType === 3) { // Text Node
                    const text = node.nodeValue;
                    if (arabicRegex.test(text) && /[^\\s]/.test(text)) {
                        const parent = node.parentNode;
                        if (!parent) return;
                        
                        // Zaten arabic-block veya arabic içindeyse atla
                        if (parent.closest('.arabic-block') || parent.closest('.arabic')) return;

                        const fragment = document.createDocumentFragment();
                        let lastIndex = 0;
                        arabicRegex.lastIndex = 0; // Reset regex
                        let match;
                        
                        while ((match = arabicRegex.exec(text)) !== null) {
                            if (match.index > lastIndex) {
                                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                            }
                            const span = document.createElement('span');
                            span.className = 'arabic';
                            span.dir = 'rtl';
                            span.textContent = match[0];
                            fragment.appendChild(span);
                            lastIndex = arabicRegex.lastIndex;
                        }
                        if (lastIndex < text.length) {
                            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                        }
                        parent.replaceChild(fragment, node);
                    }
                } else if (node.nodeType === 1) { // Element Node
                    if (['SCRIPT', 'STYLE', 'IFRAME', 'VIDEO', 'IMG'].includes(node.tagName) || node.classList.contains('arabic') || node.classList.contains('arabic-block')) return;
                    Array.from(node.childNodes).forEach(processNode);
                }
            }
            processNode(document.body);
            
        } else {
            // ESKİ ALGORİTMA: Diğer kitaplardaki mevcut davranış bozulmasın diye aynen bırakıldı
            const els = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, b, strong, i, em, mark, font'); 
            
            els.forEach(el => {
                const text = el.textContent.trim();
                if (!text) return;
                
                const arabicChars = (text.match(/[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF]/g) || []).length;
                const totalChars = text.replace(/\\s/g, '').length;
                
                if (totalChars > 0 && arabicChars > 0) {
                    const ratio = arabicChars / totalChars;
                    if (ratio > 0.6) {
                        const isBlock = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName);
                        if (isBlock) {
                            el.classList.add('arabic-block');
                            el.dir = 'rtl';
                        } else {
                            el.classList.add('arabic');
                        }
                        
                        // Inline stilleri ez
                        if (el.style.color) el.style.color = '';
                        if (el.getAttribute('color')) el.removeAttribute('color');
                    }
                }
            });
        }
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

    // 7. AUTO SCROLL LOGIC
    let autoScrollRaf;
    let autoScrollLp;
    let autoScrollSpeed = 1;
    
    window.startAutoScroll = function(speed) {
        if(speed) autoScrollSpeed = speed;
        cancelAnimationFrame(autoScrollRaf);
        autoScrollLp = Date.now();
        
        function step() {
            let now = Date.now();
            let dt = now - autoScrollLp;
            
            // Speed mapping: 1 = ~20px/s => ~1px per 50ms. High refresh rate screens need small step accumulation
            // Let's use simple fractional scroll tracking
            window.autoScrollAccumulator = (window.autoScrollAccumulator || 0) + (autoScrollSpeed * 30 * dt / 1000);
            
            if (window.autoScrollAccumulator >= 1) {
                let pixels = Math.floor(window.autoScrollAccumulator);
                window.scrollBy(0, pixels);
                window.autoScrollAccumulator -= pixels;
            }
            
            autoScrollLp = now;
            
            // Check if user touches/intervenes (simple check, full interrupt better handled native)
            autoScrollRaf = requestAnimationFrame(step);
        }
        
        autoScrollRaf = requestAnimationFrame(step);
        send("CONSOLE", { msg: "Auto scroll started at speed " + autoScrollSpeed });
    };

    window.stopAutoScroll = function() {
        cancelAnimationFrame(autoScrollRaf);
        send("CONSOLE", { msg: "Auto scroll stopped" });
    };

    window.updateAutoScrollSpeed = function(speed) {
        autoScrollSpeed = speed;
    }

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

    // Path Resolution State
    const [resolvedUri, setResolvedUri] = useState<string | null>(null);
    const [resolveError, setResolveError] = useState<string | null>(null);


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
    const MIN_FONT_SIZE = 14;
    const MAX_FONT_SIZE = 28;
    const FONT_STEP = 2;

    const [settingsVisible, setSettingsVisible] = useState(false);
    const [fontSize, setFontSize] = useState(19);
    const [themeId, setThemeId] = useState('classic');
    const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].id);
    const [textAlign, setTextAlign] = useState(ALIGN_OPTIONS[0].id);
    const [lineHeight, setLineHeight] = useState(LINE_HEIGHT_OPTIONS[1].id);

    // Auto Scroll State
    const [autoScrollSpeed, setAutoScrollSpeed] = useState(1);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);

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

    // Load saved settings
    useEffect(() => {
        AsyncStorage.getItem('reader_settings').then(val => {
            if (val) {
                try {
                    const parsed = JSON.parse(val);
                    if (parsed.fontSize) setFontSize(parsed.fontSize);
                    if (parsed.themeId) setThemeId(parsed.themeId);
                    if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
                    if (parsed.textAlign) setTextAlign(parsed.textAlign);
                    if (parsed.lineHeight) setLineHeight(parsed.lineHeight);
                } catch (e) { }
            }
        }).catch(() => { });
    }, []);

    const updateSetting = (key: string, value: any) => {
        const newSettings = { fontSize, themeId, fontFamily, textAlign, lineHeight, autoScrollSpeed, [key]: value };
        if (key === 'fontSize') setFontSize(value);
        if (key === 'themeId') setThemeId(value);
        if (key === 'fontFamily') setFontFamily(value);
        if (key === 'textAlign') setTextAlign(value);
        if (key === 'lineHeight') setLineHeight(value);
        if (key === 'autoScrollSpeed') {
            setAutoScrollSpeed(value);
            // If currently scrolling, inject speed update instantly
            if (isAutoScrolling && webViewRef.current) {
                webViewRef.current.injectJavaScript(`window.updateAutoScrollSpeed && window.updateAutoScrollSpeed(${value}); true;`);
            }
        }

        AsyncStorage.setItem('reader_settings', JSON.stringify(newSettings)).catch(() => { });
    };

    // Toggle scroll
    const toggleAutoScroll = () => {
        const nextState = !isAutoScrolling;
        setIsAutoScrolling(nextState);

        if (webViewRef.current) {
            if (nextState) {
                setSettingsVisible(false); // Close settings if open
                webViewRef.current.injectJavaScript(`window.startAutoScroll && window.startAutoScroll(${autoScrollSpeed}); true;`);
            } else {
                webViewRef.current.injectJavaScript(`window.stopAutoScroll && window.stopAutoScroll(); true;`);
            }
        }
    };

    // Inject settings into WebView whenever they change
    useEffect(() => {
        if (webViewRef.current && fontsReady) {
            const theme = THEME_OPTIONS.find(t => t.id === themeId) || THEME_OPTIONS[0];
            const script = `
                document.documentElement.style.setProperty('--base-size', '${fontSize}px');
                document.documentElement.style.setProperty('--bg', '${theme.bg}');
                document.documentElement.style.setProperty('--text', '${theme.text}');
                document.documentElement.style.setProperty('--font-family', '${fontFamily}');
                document.documentElement.style.setProperty('--text-align', '${textAlign}');
                document.documentElement.style.setProperty('--line-height', '${lineHeight}');
                
                // Adjust for dark mode specifically so arabic red doesn't look bad
                if ('${themeId}' === 'dark') {
                   document.documentElement.style.setProperty('--arabic', '#ef4444'); 
                   document.body.style.color = '#e0e0e0';
                } else if ('${themeId}' === 'sepia') {
                   document.documentElement.style.setProperty('--arabic', '#bf360c');
                   document.body.style.color = '#3E2723';
                } else {
                   document.documentElement.style.setProperty('--arabic', '#8b0000');
                   document.body.style.color = '${theme.text}';
                }
                true;`;
            webViewRef.current.injectJavaScript(script);
        }
    }, [fontSize, themeId, fontFamily, textAlign, lineHeight, fontsReady]);

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

    // Resolve Content Path (Bundled vs Downloaded)
    useEffect(() => {
        let mounted = true;

        const resolveContentUri = async () => {
            if (!bookId || !assetPath) {
                if (mounted) setResolvedUri(assetPath.startsWith('file:') ? assetPath : `file:///android_asset/${assetPath}`);
                return;
            }

            try {
                const resolution = await ContentPackResolver.resolve(bookId);

                if (!mounted) return;

                if (resolution.status === 'bundled') {
                    // Bundled asset path: file:///android_asset/...
                    setResolvedUri(`file:///android_asset/${assetPath}`);
                } else if (resolution.status === 'downloaded' && resolution.contentPath) {
                    // Downloaded asset path: extracted ZIP puts content in 'content/' folder
                    // assetPath is like 'risale_html_pilot/02_mektubat/02_01.html', we just want '02_01.html'
                    // For safety, grab the filename
                    const filename = assetPath.split('/').pop();
                    let safePath = resolution.contentPath.replace(/^file:\/\//, '');
                    if (!safePath.startsWith('/')) safePath = '/' + safePath;
                    if (!safePath.endsWith('/')) safePath += '/';
                    setResolvedUri(`file://${safePath}content/${filename}`);
                } else {
                    setResolveError(`İçerik bulunamadı (${resolution.status}). Lütfen kitabı kütüphaneden tekrar indirin.`);
                }
            } catch (err: any) {
                console.error('[Reader] Path resolution error:', err);
                if (mounted) setResolveError(err.message || "Bilinmeyen bir hata oluştu.");
            }
        };

        resolveContentUri();

        return () => {
            mounted = false;
        };
    }, [bookId, chapterId, assetPath]);

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

    // Is this the first chapter (Index/Cover page)?
    // Only replace if it's an actual index page (not "Birinci Şua")
    const isFirstChapter = currentBook?.chapters[0]?.id === chapterId;
    const firstChapterTitle = currentBook?.chapters[0]?.title?.toLowerCase() || '';
    const isCoverPage = isFirstChapter && (
        firstChapterTitle.includes('00 00') ||
        firstChapterTitle.includes('fihrist') ||
        firstChapterTitle.includes('takdim') ||
        firstChapterTitle.includes('index') ||
        firstChapterTitle.includes('içindekiler')
    );

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

    const activeTheme = THEME_OPTIONS.find(t => t.id === themeId) || THEME_OPTIONS[0];
    const isDarkTheme = themeId === 'dark';
    const isSepiaTheme = themeId === 'sepia';

    // Dynamic modal colors
    const modalBg = activeTheme.bg;
    const modalText = activeTheme.text;
    const modalSecText = isDarkTheme ? '#94a3b8' : (isSepiaTheme ? '#8b7355' : '#64748b');
    const chipBg = isDarkTheme ? '#27272a' : (isSepiaTheme ? '#e6dec1' : '#f1f5f9');
    const bColor = isDarkTheme ? '#3f3f46' : (isSepiaTheme ? '#d4ccb1' : '#e2e8f0');
    // Using simple undefined for system to not crash non-loaded fonts in Native
    const uiFont = fontFamily === 'System' ? undefined : fontFamily;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header with Back + Title + Font Controls + TOC */}
            {!isLandscape && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#efe7d1', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#d4cbb5' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
                        <Ionicons name="arrow-back" size={22} color="#334155" />
                    </TouchableOpacity>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b', marginHorizontal: 10 }}>{title}</Text>

                    {/* Auto Scroll Toggle */}
                    <TouchableOpacity onPress={toggleAutoScroll} style={{ padding: 6, marginRight: 2 }}>
                        <Ionicons name={isAutoScrolling ? "pause-circle" : "play-circle-outline"} size={26} color={isAutoScrolling ? "#ef4444" : "#334155"} />
                    </TouchableOpacity>

                    {/* Settings Control */}
                    <TouchableOpacity onPress={() => setSettingsVisible(true)} style={{ padding: 6 }}>
                        <Ionicons name="settings-outline" size={22} color="#334155" />
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

            {/* CARD READER WRAPPER -> Handled Custom Cover vs WebView */}
            <View style={{ flex: 1 }}>
                {resolveError ? (
                    <View style={{ flex: 1, backgroundColor: '#efe7d1', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <Ionicons name="warning-outline" size={60} color="#b3261e" style={{ marginBottom: 16 }} />
                        <Text style={{ fontSize: 18, color: '#b3261e', textAlign: 'center', fontWeight: 'bold' }}>{resolveError}</Text>
                        <TouchableOpacity
                            style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#111', borderRadius: 8 }}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={{ color: '#fff', fontSize: 16 }}>Geri Dön</Text>
                        </TouchableOpacity>
                    </View>
                ) : !resolvedUri ? (
                    <View style={{ flex: 1, backgroundColor: '#efe7d1', justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#111" />
                        <Text style={{ marginTop: 16, color: '#555' }}>İçerik Yükleniyor...</Text>
                    </View>
                ) : isCoverPage && currentBook ? (
                    <View style={{ flex: 1, backgroundColor: '#efe7d1', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <View style={{
                            width: 140, height: 180,
                            backgroundColor: '#8b1e16', // Dark maroon/red classic risale color
                            borderRadius: 8,
                            marginBottom: 40,
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8,
                            borderWidth: 2, borderColor: '#a73a30'
                        }}>
                            <View style={{ width: '85%', height: '90%', borderWidth: 1, borderColor: '#d4af37', borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="book" size={50} color="#d4af37" />
                            </View>
                        </View>
                        <Text style={{ fontSize: 36, fontFamily: 'serif', fontWeight: 'bold', color: '#111', textAlign: 'center', marginBottom: 16, letterSpacing: 1 }}>{currentBook.title}</Text>
                        <Text style={{ fontSize: 18, color: '#555', marginBottom: 60, fontStyle: 'italic', fontFamily: 'serif' }}>Risale-i Nur Külliyatı</Text>

                        <TouchableOpacity
                            style={{
                                backgroundColor: '#111',
                                paddingHorizontal: 36, paddingVertical: 18,
                                borderRadius: 30,
                                flexDirection: 'row', alignItems: 'center',
                                shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
                            }}
                            onPress={handleNextSection}
                        >
                            <Text style={{ color: '#efe7d1', fontSize: 18, fontWeight: 'bold', marginRight: 12, letterSpacing: 0.5 }}>Okumaya Başla</Text>
                            <Ionicons name="arrow-forward" size={22} color="#efe7d1" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <WebView
                        ref={webViewRef}
                        source={{ uri: resolvedUri }}
                        originWhitelist={['*']}
                        allowFileAccess={true}
                        allowFileAccessFromFileURLs={true}
                        allowUniversalAccessFromFileURLs={true}
                        mixedContentMode="always"
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        scalesPageToFit={false}
                        setBuiltInZoomControls={true}
                        setDisplayZoomControls={false}
                        onMessage={handleMessage}
                        // Interrupt auto scroll if user touches to scroll manually
                        onTouchStart={() => {
                            if (isAutoScrolling) {
                                toggleAutoScroll();
                            }
                        }}
                        injectedJavaScriptBeforeContentLoaded={injectCss}
                        injectedJavaScript={getInjectedJs(bookId)}
                        style={{ flex: 1, backgroundColor: '#efe7d1' }}
                        webviewDebuggingEnabled={true}
                    />
                )}
            </View>

            {/* Real Page Indicator */}
            {currentChapter && !isCoverPage && (
                <View style={styles.pageIndicator}>
                    <Text style={styles.pageText}>
                        {`~Sayfa ${currentChapter.startPage + Math.round(pageInfo.current * Math.max(0, currentChapter.pageCount - 1))} / ${bookTotalPages}`}
                    </Text>
                </View>
            )}

            {/* NEXT SECTION BUTTON */}
            {showNextButton && !isCoverPage && (
                <TouchableOpacity style={styles.nextSectionBtn} onPress={handleNextSection}>
                    <Text style={styles.nextSectionText}>Sonraki Bölüm</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            )}





            {/* Floating Back Button for Landscape (Moved to end for Z-Index Safety) */}
            {isLandscape && (
                <View style={{ position: 'absolute', top: Math.max(10, insets.top + 10), left: 10, right: 10, zIndex: 999, elevation: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TouchableOpacity
                        style={{
                            width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                        }}
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFF" />
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                            style={{
                                width: 36, height: 36, borderRadius: 18, backgroundColor: isAutoScrolling ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0,0,0,0.5)',
                                justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                            }}
                            onPress={toggleAutoScroll}
                        >
                            <Ionicons name={isAutoScrolling ? "pause" : "play"} size={18} color="#FFF" style={{ marginLeft: isAutoScrolling ? 0 : 2 }} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)',
                                justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                            }}
                            onPress={() => setSettingsVisible(!settingsVisible)}
                        >
                            <Ionicons name={settingsVisible ? 'close' : 'settings-outline'} size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
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

            {/* SETTINGS MODAL */}
            <Modal visible={settingsVisible} animationType="slide" transparent onRequestClose={() => setSettingsVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSettingsVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: modalBg }]} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.candTitle, { color: modalText, fontFamily: uiFont }]}>Okuma Ayarları</Text>
                            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                                <Ionicons name="close-circle" size={30} color={modalSecText} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.separator, { backgroundColor: bColor }]} />

                        <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: 550, paddingRight: 8 }}>
                            {/* Font Size */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Yazı Boyutu</Text>
                                <View style={styles.fontSizeControls}>
                                    <TouchableOpacity style={[styles.fontSizeBtn, { backgroundColor: chipBg }]} onPress={() => updateSetting('fontSize', Math.max(MIN_FONT_SIZE, fontSize - FONT_STEP))}>
                                        <Text style={[styles.fontSizeBtnText, { color: modalText, fontFamily: uiFont }]}>A−</Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.fontSizeValue, { color: modalText, fontFamily: uiFont }]}>{fontSize}</Text>
                                    <TouchableOpacity style={[styles.fontSizeBtn, { backgroundColor: chipBg }]} onPress={() => updateSetting('fontSize', Math.min(MAX_FONT_SIZE, fontSize + FONT_STEP))}>
                                        <Text style={[styles.fontSizeBtnText, { color: modalText, fontFamily: uiFont }]}>A+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Theme */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Tema</Text>
                            </View>
                            <View style={styles.colorRow}>
                                {THEME_OPTIONS.map(t => (
                                    <TouchableOpacity
                                        key={t.id}
                                        onPress={() => updateSetting('themeId', t.id)}
                                        style={[
                                            styles.colorCircle,
                                            { backgroundColor: t.bg, borderColor: bColor },
                                            themeId === t.id && styles.colorCircleActive
                                        ]}
                                    />
                                ))}
                            </View>

                            {/* Font Family */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Yazı Tipi</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                {FONT_OPTIONS.map(f => {
                                    const active = f.id === fontFamily;
                                    return (
                                        <TouchableOpacity
                                            key={f.id}
                                            style={[styles.chip, { backgroundColor: chipBg, borderColor: bColor }, active && styles.chipActive]}
                                            onPress={() => updateSetting('fontFamily', f.id)}
                                        >
                                            <Text style={[styles.chipText, { color: active ? '#fff' : modalText, fontFamily: f.id === 'System' ? undefined : f.id }, active && styles.chipTextActive]}>{f.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* Text Align */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Hizalama</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                {ALIGN_OPTIONS.map(a => {
                                    const active = a.id === textAlign;
                                    return (
                                        <TouchableOpacity
                                            key={a.id}
                                            style={[styles.chip, { backgroundColor: chipBg, borderColor: bColor }, active && styles.chipActive]}
                                            onPress={() => updateSetting('textAlign', a.id)}
                                        >
                                            <Text style={[styles.chipText, { color: active ? '#fff' : modalText, fontFamily: uiFont }, active && styles.chipTextActive]}>{a.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Line Height */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Satır Aralığı</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                                {LINE_HEIGHT_OPTIONS.map(l => {
                                    const active = l.id === lineHeight;
                                    return (
                                        <TouchableOpacity
                                            key={l.id}
                                            style={[styles.chip, { backgroundColor: chipBg, borderColor: bColor }, active && styles.chipActive]}
                                            onPress={() => updateSetting('lineHeight', l.id)}
                                        >
                                            <Text style={[styles.chipText, { color: active ? '#fff' : modalText, fontFamily: uiFont }, active && styles.chipTextActive]}>{l.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Auto Scroll Modülü */}
                            <View style={[styles.separator, { backgroundColor: bColor }]} />
                            <View style={[styles.settingRow, { marginBottom: 16 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: chipBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                        <Ionicons name="swap-vertical" size={18} color={modalText} />
                                    </View>
                                    <View>
                                        <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Akış Modu</Text>
                                        <Text style={{ fontSize: 12, color: modalSecText, fontFamily: uiFont }}>Otomatik ekran kaydırma</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={toggleAutoScroll}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        backgroundColor: isAutoScrolling ? '#ef4444' : '#10b981',
                                        borderRadius: 20
                                    }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, fontFamily: uiFont }}>
                                        {isAutoScrolling ? 'Durdur' : 'Başlat'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Speed Controls */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
                                <TouchableOpacity onPress={() => updateSetting('autoScrollSpeed', Math.max(0.5, autoScrollSpeed - 0.5))} style={[styles.asBtn, { backgroundColor: chipBg, borderColor: bColor }]}>
                                    <Ionicons name="remove" size={20} color={modalText} />
                                </TouchableOpacity>

                                <View style={{ alignItems: 'center', width: 60 }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: modalText, fontFamily: uiFont }}>{autoScrollSpeed.toFixed(1)}x</Text>
                                    <Text style={{ fontSize: 10, color: modalSecText, fontFamily: uiFont }}>Hız</Text>
                                </View>

                                <TouchableOpacity onPress={() => updateSetting('autoScrollSpeed', Math.min(5, autoScrollSpeed + 0.5))} style={[styles.asBtn, { backgroundColor: chipBg, borderColor: bColor }]}>
                                    <Ionicons name="add" size={20} color={modalText} />
                                </TouchableOpacity>
                            </View>

                        </ScrollView>
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
    },
    // Settings
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, marginTop: 4 },
    settingLabel: { fontSize: 15, fontWeight: '600', color: '#475569' },
    fontSizeControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    fontSizeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    fontSizeBtnText: { fontSize: 16, fontWeight: '700', color: '#334155' },
    fontSizeValue: { fontSize: 15, fontWeight: '600', color: '#475569', minWidth: 30, textAlign: 'center' },
    colorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, marginTop: 4 },
    colorCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#e2e8f0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    colorCircleActive: { borderColor: '#3b82f6', borderWidth: 3 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    chipText: { fontSize: 14, fontWeight: '500', color: '#475569' },
    chipTextActive: { color: '#fff', fontWeight: '700' },
    // Auto Scroll Controller Container
    autoScrollController: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 30,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        zIndex: 998,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    asBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc'
    },
    asPlayBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    asPlayBtnActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4
    },
    asSpeedBadge: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#1e293b',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#fff'
    },
    asSpeedText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold'
    }
});
