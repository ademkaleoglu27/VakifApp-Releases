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
    Alert,
    TextInput,
    KeyboardAvoidingView
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dictionaryDb, DictionaryEntry } from '@/services/dictionaryDb';
import { HTML_BOOKS } from '@/features/reader/html/htmlManifest.generated';
import { getLugatSuggestions, LugatSuggestion } from '@/services/ai-assist';
import { ContentPackResolver } from '@/services/ContentPackResolver';
import { TelemetryService } from '@/services/TelemetryService';
import { ENABLE_LUGAT_SUGGESTIONS } from '@/config/features';
import { checkAlias, LUGAT_ALIASES } from '@/services/lugat_aliases';
import { Linking } from 'react-native';
import { risalePagesDb } from '@/services/risalePagesDb';
import { getSozlerPageFromRnk, getRnkPageFromSozler, getRnkBookTotalPages } from '@/services/crossEditionMap';
import { saveLastRead } from '@/services/readingProgress';

const THEME_OPTIONS = [
    { id: 'classic', label: 'Klasik', bg: '#efe7d1', text: '#111' },
    { id: 'light', label: 'Aydınlık', bg: '#ffffff', text: '#000' },
    { id: 'sepia', label: 'Sepya', bg: '#f4ecd8', text: '#3E2723' },
    { id: 'dark', label: 'Gece', bg: '#121212', text: '#e0e0e0' },
];

const FONT_OPTIONS = [
    { id: 'LivaNur, "Crimson Pro", serif', label: 'LivaNur' },
    { id: 'SouvenirDemi, Georgia, serif', label: 'Souvenir' },
    { id: 'Bookerly, Georgia, serif', label: 'Bookerly' },
    { id: 'Barla, serif', label: 'Barla' },
    { id: '"Crimson Pro", "Times New Roman", serif', label: 'Klasik' },
    { id: 'Georgia, serif', label: 'Kitap' },
    { id: 'System, Roboto, Arial, sans-serif', label: 'Modern' },
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
    src: url('file:///android_asset/fonts/ScheherazadeNew.ttf') format("truetype"),
         url('../../fonts/ScheherazadeNew.ttf') format("truetype");
    font-weight: normal;
    font-style: normal;
  }

  @font-face {
    font-family: 'LivaNur';
    src: url('file:///android_asset/fonts/LivaNur.ttf') format("truetype"),
         url('../../fonts/LivaNur.ttf') format("truetype");
    font-weight: normal;
    font-style: normal;
  }

  @font-face {
    font-family: 'SouvenirDemi';
    src: url('file:///android_asset/fonts/SouvenirDemi.ttf') format("truetype"),
         url('../../fonts/SouvenirDemi.ttf') format("truetype");
    font-weight: normal;
    font-style: normal;
  }

  @font-face {
    font-family: 'Bookerly';
    src: url('file:///android_asset/fonts/latin_bookerly.ttf') format("truetype"),
         url('../../fonts/latin_bookerly.ttf') format("truetype");
    font-weight: normal;
    font-style: normal;
  }

  @font-face {
    font-family: 'Barla';
    src: url('file:///android_asset/fonts/latin_barla.ttf') format("truetype"),
         url('../../fonts/latin_barla.ttf') format("truetype");
    font-weight: normal;
    font-style: normal;
  }

  @font-face {
    font-family: 'Amiri';
    src: url('file:///android_asset/fonts/Amiri-Regular.ttf') format("truetype"),
         url('../../fonts/Amiri-Regular.ttf') format("truetype");
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
    font-family: var(--font-family) !important; 
    text-align: center !important; 
    margin: 32px 0 16px !important; 
    line-height: 1.35 !important; 
    color: var(--heading, #8b0000) !important;
    font-weight: bold !important;
  }
  body.dark h1, body.dark h2, body.dark h3,
  body.night h1, body.night h2, body.night h3 {
    color: #C5A059 !important;
  }

  /* Title Fix: H1 */
  h1, .heading-1 {
      font-size: clamp(22px, 1.3rem, 28px) !important;
  }

  /* Subtitle: H2 */
  h2, .heading-2 {
      font-size: clamp(20px, 1.2rem, 24px) !important;
  }

  /* Section: H3 */
  h3, .heading-3 {
      font-size: clamp(19px, 1.1rem, 21px) !important;
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

  /* 6. VURGU, BOLD CONTRAST & ESMALAR */
  strong, b {
    font-weight: bold !important;
    color: #111111 !important;
    -webkit-user-select: text !important;
    user-select: text !important;
  }
  body.dark strong, body.dark b,
  body.night strong, body.night b {
    color: #F3F4F6 !important;
  }

  /* 7. CLEAN FIHRIST INDEX (Fixes leaked markup) */
  .fihrist-entry {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 8px 0;
    border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
    font-size: 1.02em;
  }
  .fihrist-title {
    flex: 1;
    padding-right: 12px;
    font-weight: 500;
  }
  .fihrist-page {
    font-weight: bold;
    color: #B45309;
    min-width: 36px;
    text-align: right;
  }
  .intro-callout {
    font-style: italic;
    color: #374151;
    border-left: 3px solid #C5A059;
    padding-left: 12px;
    margin: 14px 0;
  }

  /* 8. PRINTED SÖZLER IN-PAGE DIVIDER (Dark Red Line + Right Page Number) */
  .page-marker-wrap {
    display: block !important;
    position: static !important;
    margin: 28px 0 14px 0 !important;
    border-top: 1.5px solid #8b0000 !important;
    text-align: right !important;
    padding-top: 2px !important;
    pointer-events: none !important;
  }
  body.dark .page-marker-wrap,
  body.night .page-marker-wrap {
    border-top-color: #C5A059 !important;
  }
  .page-marker {
    display: inline-block !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    color: #8b0000 !important;
    background: transparent !important;
    border: none !important;
    padding: 0 4px !important;
  }
  body.dark .page-marker,
  body.night .page-marker {
    color: #C5A059 !important;
  }
</style>
`;

// --- JS CONTROLLER ---
const getInjectedJs = (bookId?: string, targetPage?: number) => `
(function() {
    const CURRENT_BOOK = "${bookId || ''}";
    
    // 1. MESSAGING HELPER (SAFE)
    function send(type, payload) {
        payload = payload || {};
        try {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload)));
            }
        } catch(e) {
            console.error('[send error]', e);
        }
    }

    send("LOG", { message: "INJECTED_JS_LOADED v9.0" });

    // 1.5. ENSURE INJECTED STYLES ARE APPLIED
    try {
        var target = document.head || document.documentElement || document.body;
        if (target && !document.getElementById('app-injected-style')) {
            var style = document.createElement('style');
            style.id = 'app-injected-style';
            style.textContent = ${JSON.stringify(getHtmlCss().replace(/<style>/g, '').replace(/<\/style>/g, ''))};
            target.appendChild(style);
        }
    } catch(e) {}

    // 2. FONTS READY
    function checkFonts() {
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function() {
                send("FONTS_READY");
            }).catch(function() {
                send("FONTS_READY");
            });
        } else {
            send("FONTS_READY");
        }
    }
    checkFonts();

    // 2.5. RUNTIME DOM CLEANUP FOR RAW TAGS
    function cleanDomMarkup() {
        try {
            var BT = String.fromCharCode(96);
            var elements = document.querySelectorAll('p, div');
            for (var i = 0; i < elements.length; i++) {
                var el = elements[i];
                var h = el.innerHTML;
                if (h.indexOf('§Sahife No') !== -1) {
                    el.remove();
                    continue;
                }
                var changed = false;
                if (h.indexOf(':>') !== -1 && h.indexOf(BT) !== -1) {
                    var fihristRegex = new RegExp(BT + '\\\\s*(.*?):>\\\\s*(\\\\d+)', 'g');
                    h = h.replace(fihristRegex, function(m, t, num) {
                        return '<div class="fihrist-entry"><span class="fihrist-title">' + t.trim() + '</span><span class="fihrist-page">' + num.trim() + '</span></div>';
                    });
                    changed = true;
                }
                if (h.indexOf('\\\\') !== -1 && h.indexOf('>') !== -1) {
                    h = h.replace(/\\\\([^>\\n\\r]{1,100})>/g, '<strong>$1</strong>');
                    changed = true;
                }
                if (h.indexOf('∫') !== -1) {
                    h = h.replace(/,∫|∫/g, '');
                    changed = true;
                }
                if (changed) {
                    el.innerHTML = h;
                }
            }
            var pageMarkers = document.querySelectorAll('.page-marker');
            for (var p = 0; p < pageMarkers.length; p++) {
                var pm = pageMarkers[p];
                if (pm && pm.textContent && pm.textContent.indexOf('Sayfa ') !== -1) {
                    pm.textContent = pm.textContent.replace('Sayfa ', '').trim();
                }
            }
        } catch(e) {}
    }
    cleanDomMarkup();
    setTimeout(cleanDomMarkup, 200);

    // 3. METRICS (SCROLL & END DETECTION - PURE VERTICAL)
    function reportMetrics() {
        try {
            var scrollTop = window.scrollY || window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || (document.body && document.body.scrollTop) || 0;
            var viewportHeight = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 0;
            var contentHeight = Math.max(
                (document.documentElement && document.documentElement.scrollHeight) || 0,
                (document.body && document.body.scrollHeight) || 0
            );
            
            if (viewportHeight < 10) return;

            var currentPage = Math.floor(scrollTop / viewportHeight) + 1;
            var totalPages = Math.ceil(contentHeight / viewportHeight) || 1;
            var isAtEnd = (scrollTop + viewportHeight) >= (contentHeight - 200);

            send("METRICS", { 
                scrollTop: scrollTop, 
                viewportHeight: viewportHeight, 
                contentHeight: contentHeight, 
                currentPage: currentPage, 
                totalPages: totalPages,
                isAtEnd: isAtEnd 
            });
        } catch(e) {}
    }

    window.addEventListener('scroll', function() {
        reportMetrics();
    }, { passive: true });
    window.addEventListener('resize', reportMetrics, { passive: true });
    
    setTimeout(reportMetrics, 100);
    setTimeout(reportMetrics, 500);
    setTimeout(reportMetrics, 1500);

    // 4. SELECTION MANAGER (WITH SÖZLER APP COMPOUND EXPANSION)
    var _detectWordRunning = false;
    function detectWord() {
        if (_detectWordRunning) return false;
        _detectWordRunning = true;
        try {
            var ws = window.getSelection();
            if (!ws || !ws.anchorNode || ws.anchorNode.nodeType !== 3) return false;
            if (!ws.focusNode || ws.focusNode.nodeType !== 3) return false;
            var str = ws.toString();
            if (!str || str.trim().length === 0) return false;

            // If manual multi-word selection (> 4 words), don't auto-expand
            if (str.trim().split(/\\s+/).length > 4) return false;

            var findBlock = function(node) {
                var el = node.parentNode;
                while (el && el.parentNode && el.nodeType === 1) {
                    var tn = el.tagName ? el.tagName.toUpperCase() : '';
                    if (tn === 'P' || tn === 'DIV' || tn === 'BODY' || tn === 'HTML') return el;
                    el = el.parentNode;
                }
                return el || document.body;
            };

            var container = findBlock(ws.anchorNode);
            if (!container || container.nodeType !== 1) return false;

            var tw = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
            var ft = '';
            var tn = [];
            var ts = [];
            var nd;
            while ((nd = tw.nextNode())) {
                ts.push(ft.length);
                tn.push(nd);
                ft += nd.textContent;
            }
            if (tn.length === 0) return false;

            var ai = tn.indexOf(ws.anchorNode);
            var fi = tn.indexOf(ws.focusNode);
            if (ai === -1 || fi === -1) return false;
            var anchorPos = ts[ai] + ws.anchorOffset;
            var focusPos = ts[fi] + ws.focusOffset;
            var selStart = Math.min(anchorPos, focusPos);
            var selEnd = Math.max(anchorPos, focusPos);

            var origStart = selStart;
            var origEnd = selEnd;

            // Clean trailing punctuation
            while (selEnd > selStart && /[.;,!?:،؛«»"'\u201D\u201C\(\)]/.test(ft[selEnd - 1])) {
                selEnd--;
            }

            var JOINERS = {"'":1, "\\u2019":1, "\\u2018":1, "\\u200C":1, "\\u0640":1};
            var IZAFET = 'uUûÛüÜiıîìIÎ';
            var CONN_END = /[-\\u2011](?:[iıuüûîIÜÛÎ]|y[iıuüûî])$/;

            var wS = function(pos) {
                var s = pos;
                while (s > 0 && ft[s-1] !== ' ' && ft[s-1] !== '\\n') s--;
                return s;
            };
            var wE = function(pos) {
                var e = pos;
                while (e < ft.length && ft[e] !== ' ' && ft[e] !== '\\n') e++;
                return e;
            };

            var fc = ft[selStart];
            if (fc === '-' || fc === '\\u2011' || JOINERS[fc]) {
                if (selStart > 0) selStart = wS(selStart - 1);
            }
            var lc = ft[selEnd - 1];
            if (lc === '-' || lc === '\\u2011' || JOINERS[lc]) {
                selEnd = wE(selEnd);
            }

            // BACKLOOP: Kök kelimeyi bul
            var bi = 20;
            while (bi-- > 0) {
                if (selStart <= 0) break;
                var prev = ft[selStart - 1];

                if (prev === '-' || prev === '\\u2011' || JOINERS[prev]) {
                    selStart = wS(selStart - 1);
                    continue;
                }
                var bf = false;
                for (var i = 0; i < 4; i++) {
                    var p = selStart - i - 1;
                    if (p < 0) break;
                    var ch = ft[p];
                    if (ch === '-' || ch === '\\u2011') {
                        selStart = wS(p);
                        bf = true;
                        break;
                    }
                    if (IZAFET.indexOf(ch) !== -1 && p - 1 >= 0 && p + 1 < ft.length && ft[p + 1] === ' ') {
                        var bef = ft[p - 1];
                        if (bef === ' ' || bef === '-' || bef === '\\u2011') {
                            selStart = wS(p - 1);
                            bf = true;
                            break;
                        }
                    }
                }
                if (!bf) break;
            }

            // FORWARDLOOP: Terkibi tamamla
            var fii = 20;
            while (fii-- > 0) {
                if (selEnd >= ft.length) break;
                var nx = ft[selEnd];

                if (JOINERS[nx]) {
                    var fe = wE(selEnd + 1);
                    if (fe <= selEnd) break;
                    selEnd = fe;
                    continue;
                }
                if (nx === '-' || nx === '\\u2011') {
                    var fe = wE(selEnd + 1);
                    var cl = fe - selEnd - 1;
                    if (cl <= 3 && fe < ft.length && ft[fe] === ' ') {
                        fe = wE(fe + 1);
                    }
                    selEnd = fe;
                    continue;
                }
                if (nx === ' ') {
                    if (selEnd + 2 < ft.length && 'uUûÛüÜ'.indexOf(ft[selEnd + 1]) !== -1 && ft[selEnd + 2] === ' ') {
                        selEnd = wE(selEnd + 3);
                        continue;
                    }
                    if (CONN_END.test(ft.substring(selStart, selEnd))) {
                        var fe = wE(selEnd + 1);
                        if (fe > selEnd + 1) { selEnd = fe; continue; }
                    }
                }
                break;
            }

            var resolve = function(abs) {
                for (var i = tn.length - 1; i >= 0; i--) {
                    if (abs >= ts[i]) {
                        var loc = abs - ts[i];
                        if (loc > tn[i].textContent.length) loc = tn[i].textContent.length;
                        return { n: tn[i], o: loc };
                    }
                }
                return { n: tn[0], o: 0 };
            };

            if (selStart !== origStart || selEnd !== origEnd) {
                var sr = resolve(selStart);
                var er = resolve(selEnd);
                if (ws.setBaseAndExtent) {
                    ws.setBaseAndExtent(sr.n, sr.o, er.n, er.o);
                }
            }
            return true;
        } catch(e) {
            return false;
        } finally {
            _detectWordRunning = false;
        }
    }

    let selectionTimeout;
    function handleSelectionChange() {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(function() {
            var sel = window.getSelection();
            if (!sel || !sel.toString || sel.toString().trim().length === 0) {
                send("SELECTION", { text: "" });
                return;
            }
            detectWord();
            var text = (window.getSelection() ? window.getSelection().toString().trim() : "") || sel.toString().trim();
            if (text.length > 0) {
                send("SELECTION", { text: text });
            }
        }, 150);
    }

    document.addEventListener('selectionchange', handleSelectionChange, { passive: true });

    window.resetSelectionAPI = function() {
        try {
            var sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
            }
        } catch(e) {}
        setTimeout(function() {
            send("SELECTION", { text: "" });
        }, 50);
    };

    // 5. AUTO-TAG ARABIC BLOCKS
    function tagArabicBlocks() {
        var blocks = document.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6');
        var arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
        
        for (var i = 0; i < blocks.length; i++) {
            var el = blocks[i];
            if (el.classList.contains('arabic-block')) continue;
            var text = el.textContent || '';
            if (text.length < 5) continue;
            var matches = text.match(arabicRegex);
            var count = matches ? matches.length : 0;
            var totalChars = text.replace(/\s+/g, '').length;
            if (totalChars > 0 && (count / totalChars) > 0.6) {
                el.classList.add('arabic-block');
                el.setAttribute('dir', 'rtl');
            }
        }
    }
    tagArabicBlocks();

    // 6. CARET WORD EXTRACTION WITH RANGE
    function extractWordFromPoint(x, y) {
        var range = null;
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(x, y);
        } else if (document.caretPositionFromPoint) {
            var pos = document.caretPositionFromPoint(x, y);
            if (pos) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.collapse(true);
            }
        }
        if (!range || !range.startContainer) return null;

        var node = range.startContainer;
        var offset = range.startOffset;

        if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.childNodes && node.childNodes.length > 0) {
                var childIdx = Math.min(offset, node.childNodes.length - 1);
                node = node.childNodes[childIdx];
                while (node && node.nodeType === Node.ELEMENT_NODE && node.firstChild) {
                    node = node.firstChild;
                }
                offset = 0;
            }
        }

        if (!node || node.nodeType !== Node.TEXT_NODE) return null;
        var text = node.textContent;
        if (!text) return null;
        if (offset >= text.length && offset > 0) offset = text.length - 1;

        function isWordChar(ch) {
            if (!ch) return false;
            return /[a-zA-ZçÇğĞıİöÖşŞüÜâÂîÎûÛêÊôÔ'’ʼ\x60\-\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(ch);
        }

        if (!isWordChar(text[offset])) {
            if (offset > 0 && isWordChar(text[offset - 1])) {
                offset--;
            } else if (offset + 1 < text.length && isWordChar(text[offset + 1])) {
                offset++;
            } else {
                return null;
            }
        }

        var start = offset;
        while (start > 0 && isWordChar(text[start - 1])) start--;
        var end = offset;
        while (end < text.length && isWordChar(text[end])) end++;

        var w = text.substring(start, end).trim();
        w = w.replace(/^[^a-zA-ZçÇğĞıİöÖşŞüÜâÂîÎûÛ\u0600-\u06FF]+/, '')
             .replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜâÂîÎûÛ\u0600-\u06FF]+$/, '');
        
        if (w.length < 2) return null;

        var wordRange = null;
        try {
            wordRange = document.createRange();
            wordRange.setStart(node, start);
            wordRange.setEnd(node, end);
        } catch(re) {}

        return { word: w, range: wordRange };
    }

    function getWordAtPointWithRange(x, y) {
        var probes = [
            [0, 0],
            [0, -5],
            [0, 5],
            [0, -10],
            [0, 10],
            [-8, 0],
            [8, 0]
        ];
        for (var i = 0; i < probes.length; i++) {
            var res = extractWordFromPoint(x + probes[i][0], y + probes[i][1]);
            if (res && res.word && res.word.length >= 2) {
                return res;
            }
        }
        return null;
    }

    // 7. TOUCH & CLICK LISTENERS (LONG-PRESS FOR LUGAT)
    var touchStartX = 0;
    var touchStartY = 0;
    var touchStartTime = 0;
    var hasTouchMoved = false;
    var longPressTimer = null;
    var LONG_PRESS_DELAY = 450;

    document.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            hasTouchMoved = false;

            if (longPressTimer) clearTimeout(longPressTimer);

            longPressTimer = setTimeout(function() {
                if (hasTouchMoved) return;

                // 1. Arabic Block Check
                var target = document.elementFromPoint(touchStartX, touchStartY);
                if (target) {
                    var arabic = target.closest && (target.closest('.arabic-block') || target.closest('.arabic'));
                    if (arabic) {
                        var arabicText = arabic.textContent.trim();
                        if (arabicText.length > 3) {
                            send("AYET_CLICK", { text: arabicText, mealId: arabic.getAttribute('data-meal-id') });
                            return;
                        }
                    }
                }

                // 2. Word Check -> Quick Lugat with Compound Expansion
                var wordData = getWordAtPointWithRange(touchStartX, touchStartY);
                if (wordData && wordData.word && wordData.word.length >= 2) {
                    try {
                        if (wordData.range) {
                            var sel = window.getSelection();
                            if (sel) {
                                sel.removeAllRanges();
                                sel.addRange(wordData.range);
                                detectWord();
                            }
                        }
                    } catch(rangeErr) {}
                    var fullText = (window.getSelection() ? window.getSelection().toString().trim() : '') || wordData.word;
                    send("QUICK_LUGAT", { word: fullText });
                    send("SELECTION", { text: fullText });
                }
            }, LONG_PRESS_DELAY);
        }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        if (e.touches.length > 0) {
            var dx = Math.abs(e.touches[0].clientX - touchStartX);
            var dy = Math.abs(e.touches[0].clientY - touchStartY);
            if (dx > 10 || dy > 10) {
                hasTouchMoved = true;
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        var elapsed = Date.now() - touchStartTime;

        setTimeout(function() {
            var sel = window.getSelection();
            var text = sel ? sel.toString().trim() : "";
            if (text.length > 0) {
                send("SELECTION", { text: text });
            }
        }, 200);

        if (!hasTouchMoved && elapsed < 350 && e.changedTouches.length === 1) {
            var touch = e.changedTouches[0];
            var target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!target) return;

            var marker = target.closest && target.closest('.fn-marker');
            if (marker) {
                var fnId = marker.getAttribute('data-fn-id');
                var contentEl = fnId ? document.querySelector('#footnotes [data-fn-id="' + fnId + '"]') : null;
                var fnText = contentEl ? (contentEl.innerText || contentEl.textContent || "").trim() : "";
                if (fnText) {
                    send("FOOTNOTE_CONTENT", { text: fnText });
                } else {
                    send("FOOTNOTE", { id: fnId });
                }
                return;
            }

            var arabic = target.closest && (target.closest('.arabic-block') || target.closest('.arabic'));
            if (arabic) {
                var arabicText = arabic.textContent.trim();
                if (arabicText.length > 3) {
                    send("AYET_CLICK", { text: arabicText, mealId: arabic.getAttribute('data-meal-id') });
                    return;
                }
            }

            // Screen tap: Edge tap navigation (left/right edges)
            var winW = window.innerWidth;
            var touchX = touch.clientX;
            if (touchX > winW * 0.82) {
                send("EDGE_TAP", { edge: "right" });
            } else if (touchX < winW * 0.18) {
                send("EDGE_TAP", { edge: "left" });
            }
            // Note: Center tap menu toggle is removed in favor of the Sözler-style floating grid button
        }
    }, { passive: true });

    document.addEventListener('dblclick', function(e) {
        var wordData = getWordAtPointWithRange(e.clientX, e.clientY);
        if (wordData && wordData.word && wordData.word.length >= 2) {
            send("QUICK_LUGAT", { word: wordData.word });
        }
    });

    // 8. AUTO SCROLL LOGIC
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
            window.autoScrollAccumulator = (window.autoScrollAccumulator || 0) + (autoScrollSpeed * 30 * dt / 1000);
            
            if (window.autoScrollAccumulator >= 1) {
                let pixels = Math.floor(window.autoScrollAccumulator);
                window.scrollBy(0, pixels);
                window.autoScrollAccumulator -= pixels;
            }
            
            autoScrollLp = now;
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
    };

    window.scrollToPage = function(pageNum) {
        try {
            var targetStr = String(pageNum).trim();
            var markers = document.querySelectorAll('.page-marker');
            var matchedEl = null;
            for (var i = 0; i < markers.length; i++) {
                if (markers[i].textContent.trim() === targetStr) {
                    matchedEl = markers[i].closest('.page-marker-wrap') || markers[i];
                    break;
                }
            }
            if (!matchedEl && markers.length > 0) {
                var targetInt = parseInt(targetStr, 10);
                var bestMarker = null;
                var minDiff = 999999;
                for (var j = 0; j < markers.length; j++) {
                    var curInt = parseInt(markers[j].textContent.trim(), 10);
                    if (!isNaN(curInt)) {
                        var diff = Math.abs(curInt - targetInt);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestMarker = markers[j];
                        }
                    }
                }
                if (bestMarker) {
                    matchedEl = bestMarker.closest('.page-marker-wrap') || bestMarker;
                }
            }
            if (matchedEl) {
                var rect = matchedEl.getBoundingClientRect();
                var targetY = window.pageYOffset + rect.top - 15;
                window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
                // Second pass check in case layout/fonts shift after 250ms
                setTimeout(function() {
                    var r2 = matchedEl.getBoundingClientRect();
                    if (Math.abs(r2.top) > 50) {
                        var y2 = window.pageYOffset + r2.top - 15;
                        window.scrollTo({ top: Math.max(0, y2), behavior: 'auto' });
                    }
                }, 250);
                return true;
            }
            return false;
        } catch(e) {
            return false;
        }
    };

    var initialTarget = ${targetPage ? Number(targetPage) : 'null'};
    if (initialTarget) {
        setTimeout(function() { window.scrollToPage(initialTarget); }, 120);
        setTimeout(function() { window.scrollToPage(initialTarget); }, 450);
    }

    send("LOG", { message: "INJECTED_JS_COMPLETE v9.0, listeners attached" });
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

    // Book & Chapter info
    const currentBook = bookId ? HTML_BOOKS[bookId] : null;
    const currentChapter = currentBook?.chapters.find(c => c.id === chapterId);
    const bookTotalPages = currentBook ? (() => {
        if (!currentBook.chapters || currentBook.chapters.length === 0) return 0;
        return Math.max(...currentBook.chapters.map(c => (c.startPage || 1) + (c.pageCount || 1) - 1));
    })() : 0;
    const rnkBookTotalPages = bookId ? getRnkBookTotalPages(bookId) : null;

    const getNextChapter = () => {
        if (!bookId || !chapterId) return null;
        const book = HTML_BOOKS[bookId];
        if (!book) return null;
        const index = book.chapters.findIndex(c => c.id === chapterId);
        if (index === -1 || index === book.chapters.length - 1) return null;
        return book.chapters[index + 1];
    };
    const nextChapter = getNextChapter();

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

    // Floating Menu State (Matches Sözler reference Screenshot)
    const [showFloatingMenu, setShowFloatingMenu] = useState(false);

    // Page Progression Mode (Yukarı Kaydır, Kenara Dokun)
    const [pageProgressionMode, setPageProgressionMode] = useState<'vertical' | 'tap'>('vertical');
    const [progressionModalVisible, setProgressionModalVisible] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);

    // Live Clock State (HH:mm) for Reader Footer
    const [currentTime, setCurrentTime] = useState(() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Sayfaya Git (Go to Page) State
    const [gotoPageModalVisible, setGotoPageModalVisible] = useState(false);
    const [targetPageInput, setTargetPageInput] = useState("");
    const [gotoEdition, setGotoEdition] = useState<'sozler' | 'rnk'>('sozler');

    const handleGotoPage = (pageStr: string, edition: 'sozler' | 'rnk' = gotoEdition) => {
        const rawP = parseInt(pageStr.trim(), 10);
        if (isNaN(rawP) || rawP < 1) {
            Alert.alert('Geçersiz Sayfa', 'Lütfen geçerli bir sayfa numarası girin.');
            return;
        }

        let p = rawP;
        if (edition === 'rnk' && bookId) {
            if (rnkBookTotalPages && rawP > rnkBookTotalPages) {
                Alert.alert('Geçersiz Sayfa', `Lütfen 1 ile ${rnkBookTotalPages} arasında bir RNK sayfa numarası girin.`);
                return;
            }
            p = getSozlerPageFromRnk(bookId, rawP);
        } else {
            if (bookTotalPages > 0 && rawP > bookTotalPages) {
                Alert.alert('Geçersiz Sayfa', `Lütfen 1 ile ${bookTotalPages} arasında geçerli bir sayfa numarası girin.`);
                return;
            }
        }

        setGotoPageModalVisible(false);
        setTargetPageInput("");

        if (!currentBook) return;
        const targetChapter = currentBook.chapters.find(c => p >= c.startPage && p < c.startPage + c.pageCount)
            || [...currentBook.chapters].reverse().find(c => p >= c.startPage)
            || currentBook.chapters[0];

        if (targetChapter.id === chapterId) {
            webViewRef.current?.injectJavaScript(`
                if (typeof window.scrollToPage === 'function') {
                    window.scrollToPage(${p});
                }
                true;
            `);
        } else {
            navigation.replace('RisaleHtmlReader', {
                assetPath: targetChapter.assetPath,
                title: targetChapter.title,
                bookId: bookId,
                chapterId: targetChapter.id,
                targetPage: p
            });
        }
    };

    useEffect(() => {
        if (route.params?.targetPage && webViewRef.current) {
            const timer = setTimeout(() => {
                webViewRef.current?.injectJavaScript(`
                    if (typeof window.scrollToPage === 'function') {
                        window.scrollToPage(${route.params.targetPage});
                    }
                    true;
                `);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [route.params?.targetPage]);

    // Dedicated Külliyat 120,000-Word Dictionary Search Modal State
    const [dictSearchModalVisible, setDictSearchModalVisible] = useState(false);
    const [searchModalEntry, setSearchModalEntry] = useState<DictionaryEntry | null>(null);
    const [dictSearchQuery, setDictSearchQuery] = useState("");
    const [liveSearchResults, setLiveSearchResults] = useState<DictionaryEntry[]>([]);
    const [isSearchingDict, setIsSearchingDict] = useState(false);

    const handleDictSearchChange = async (text: string) => {
        setDictSearchQuery(text);
        if (!text || text.trim().length === 0) {
            setLiveSearchResults([]);
            return;
        }
        setIsSearchingDict(true);
        try {
            const results = await dictionaryDb.search(text.trim());
            setLiveSearchResults(results);
        } catch (e) {
            console.error('[DictSearch] Error:', e);
        } finally {
            setIsSearchingDict(false);
        }
    };

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

    // Load saved settings & bookmark
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

        AsyncStorage.getItem('risale_page_progression_mode').then(val => {
            if (val && ['vertical', 'tap'].includes(val)) {
                setPageProgressionMode(val as any);
            }
        }).catch(() => { });

        if (bookId) {
            AsyncStorage.getItem(`risale_bookmark_${bookId}`).then(val => {
                if (val) {
                    try {
                        const parsed = JSON.parse(val);
                        setIsBookmarked(parsed.chapterId === chapterId);
                    } catch { }
                } else {
                    setIsBookmarked(false);
                }
            }).catch(() => { });
        }
    }, [bookId, chapterId]);

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
                setShowFloatingMenu(false);
                webViewRef.current.injectJavaScript(`window.startAutoScroll && window.startAutoScroll(${autoScrollSpeed}); true;`);
            } else {
                webViewRef.current.injectJavaScript(`window.stopAutoScroll && window.stopAutoScroll(); true;`);
            }
        }
    };

    // Page navigation helper (for smooth vertical scrolling & edge tap)
    const scrollNextPage = useCallback(() => {
        if (pageInfo.isAtEnd || pageInfo.current >= 0.96) {
            handleNextSection();
        } else {
            webViewRef.current?.injectJavaScript(`
                window.scrollBy({ top: window.innerHeight * 0.88, behavior: 'smooth' });
                true;
            `);
        }
    }, [pageInfo, nextChapter, handleNextSection]);

    const scrollPrevPage = useCallback(() => {
        webViewRef.current?.injectJavaScript(`
            window.scrollBy({ top: -window.innerHeight * 0.88, behavior: 'smooth' });
            true;
        `);
    }, []);

    // Toggle bookmark
    const handleToggleBookmark = useCallback(async () => {
        try {
            if (!bookId || !chapterId) return;
            const key = `risale_bookmark_${bookId}`;
            if (isBookmarked) {
                await AsyncStorage.removeItem(key);
                setIsBookmarked(false);
                Alert.alert('Yer İşareti', 'Yer işareti kaldırıldı.');
            } else {
                const data = {
                    bookId,
                    chapterId,
                    title,
                    scrollRatio: pageInfo.current,
                    date: new Date().toISOString()
                };
                await AsyncStorage.setItem(key, JSON.stringify(data));
                setIsBookmarked(true);
                Alert.alert('Yer İşareti', 'Kaldığınız sayfa kaydedildi.');
            }
        } catch (e) {
            console.warn('Bookmark error:', e);
        }
    }, [bookId, chapterId, title, pageInfo.current, isBookmarked]);

    // Inject settings into WebView whenever they change
    useEffect(() => {
        if (webViewRef.current) {
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

    // Footnote State
    const [footnoteVisible, setFootnoteVisible] = useState(false);
    const [footnoteContent, setFootnoteContent] = useState("");

    // AI Modal State
    const [aiModalVisible, setAiModalVisible] = useState(false);

    // Ayet / Hadis Meal State
    const [mealModalVisible, setMealModalVisible] = useState(false);
    const [mealTab, setMealTab] = useState<'meal' | 'arabic'>('meal');
    const [activeMeal, setActiveMeal] = useState<{ arabic: string; meal: string; source: string } | null>(null);

    const handleAyetClick = async (text: string) => {
        try {
            const meal = await risalePagesDb.getAyetMeal(text);
            if (meal) {
                setActiveMeal({
                    arabic: meal.arabic_text || text,
                    meal: meal.meal_tr,
                    source: meal.source_ref || "Risale-i Nur Meâli"
                });
                setMealTab('meal');
                setMealModalVisible(true);
            } else {
                setActiveMeal({
                    arabic: text,
                    meal: "Bu Arapça ibare için doğrudan meâl kaydı bulunamadı.",
                    source: "Risale-i Nur"
                });
                setMealTab('meal');
                setMealModalVisible(true);
            }
        } catch (e) {
            console.error('[AyetClick] Error:', e);
        }
    };

    const lookupWord = async (rawWord: string) => {
        let query = (rawWord || '').trim();
        if (!query || query.length < 2) return;

        // Clean query for display and search
        const displayWord = dictionaryDb.cleanWordForLugat(query) || query;
        setSearchedWord(displayWord);
        setLocalSuggestions([]);
        setSuggestionsLoading(false);

        // 0. CHECK ARABIC AYET / HADIS MEAL
        const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(query);
        if (isArabic && query.length > 3) {
            try {
                const meal = await risalePagesDb.getAyetMeal(query);
                if (meal) {
                    setActiveMeal({
                        arabic: meal.arabic_text || query,
                        meal: meal.meal_tr,
                        source: meal.source_ref || "Risale-i Nur Meâli"
                    });
                    setMealTab('meal');
                    setMealModalVisible(true);
                    return;
                }
            } catch (e) {
                console.error('[Lugat] Meal check error:', e);
            }
        }

        // 1. CHECK ALIAS (Mapping Katmanı)
        const alias = checkAlias(displayWord);
        if (alias) {
            console.log(`[Lugat] Alias found: "${displayWord}" -> "${alias}"`);
            query = alias;
        } else {
            query = displayWord;
        }

        // Use flexible search to handle punctuation and normalization
        console.log('[Lugat] Searching for:', query);
        const { best, candidates } = await dictionaryDb.searchFlexible(query);
        console.log('[Lugat] Search Result:', { best: best?.word_tr, candidateCount: candidates.length });

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
    };

    useEffect(() => {
        dictionaryDb.init().catch(console.error);
        risalePagesDb.init().catch(console.error);
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
        (function() {
            try {
                var target = document.head || document.documentElement || document.body;
                if (target && !document.getElementById('app-injected-style')) {
                    var style = document.createElement('style');
                    style.id = 'app-injected-style';
                    style.textContent = ${JSON.stringify(getHtmlCss().replace(/<style>/g, '').replace(/<\/style>/g, ''))};
                    target.appendChild(style);
                }
            } catch(e) {}
        })();
        true;
    `;

    // Handlers
    const handleCandidatePress = (entry: DictionaryEntry) => {
        setDictEntry(entry);
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('[handleMessage] Received:', data.type, JSON.stringify(data).substring(0, 160));

            switch (data.type) {
                case 'LOG':
                    console.log('[WebView Log]', data.message);
                    break;
                case 'FONTS_READY':
                    console.log('[WebView] Fonts Ready');
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
                    console.log('[Selection]', data.text);
                    setSelectedText(data.text || "");
                    break;
                case 'CONSOLE':
                    console.log('[WebView Console]', data.msg);
                    break;
                case 'FOOTNOTE':
                    // Fetch content by ID from DOM or fallback
                    webViewRef.current?.injectJavaScript(`
                        (function(){
                            var fnId = "${data.id}";
                            var el = document.querySelector('#footnotes [data-fn-id="' + fnId + '"]');
                            var text = el ? (el.innerText || el.textContent) : (window.FOOTNOTES ? window.FOOTNOTES[fnId] : "");
                            if (text) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FOOTNOTE_CONTENT', text: text.trim() }));
                            }
                        })();
                        true;
                    `);
                    break;
                case 'FOOTNOTE_CONTENT':
                    setFootnoteContent(data.text);
                    setFootnoteVisible(true);
                    break;
                case 'AYET_CLICK':
                    if (data.text) {
                        handleAyetClick(data.text);
                    }
                    break;
                case 'LUGAT_CLICK':
                case 'QUICK_LUGAT':
                    if (data.word) {
                        lookupWord(data.word);
                    }
                    break;
                case 'TOGGLE_MENU':
                    setShowFloatingMenu(prev => !prev);
                    break;
                case 'EDGE_TAP':
                    if (pageProgressionMode === 'tap') {
                        if (data.edge === 'right') scrollNextPage();
                        else scrollPrevPage();
                    }
                    break;
            }
        } catch (e) {
            console.error('[handleMessage] Error:', e, 'raw data:', event?.nativeEvent?.data);
        }
    };

    // Show next button when at end of content or when scrolled >= 88%
    const showNextButton = !!(nextChapter && (pageInfo.isAtEnd || pageInfo.current >= 0.88));

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
        <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.bg }]} edges={['top', 'left', 'right']}>
            {/* Top Bar removed for clean immersive reading as in reference screenshot */}

            {/* TOC Modal (Premium Clean White Theme) */}
            <Modal visible={tocVisible} animationType="slide" transparent onRequestClose={() => setTocVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTocVisible(false)}>
                    <View style={styles.lightModalContent}>
                        <View style={styles.lightDragHandle} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={styles.lightModalTitle}>İçindekiler</Text>
                            <TouchableOpacity onPress={() => setTocVisible(false)}>
                                <Ionicons name="close-circle" size={26} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={currentBook?.chapters || []}
                            keyExtractor={(item) => item.id}
                            style={{ maxHeight: 420 }}
                            renderItem={({ item, index }) => {
                                const isActive = item.id === chapterId;
                                return (
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 12,
                                            paddingHorizontal: 16,
                                            borderRadius: 12,
                                            backgroundColor: isActive ? '#FEF3C7' : 'transparent',
                                            marginBottom: 4,
                                        }}
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
                                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isActive ? '#C5A059' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: isActive ? '#FFFFFF' : '#64748B' }}>{index + 1}</Text>
                                        </View>
                                        <Text style={{ flex: 1, fontSize: 14, color: isActive ? '#92400E' : '#1E293B', fontWeight: isActive ? '700' : '400' }}>{item.title}</Text>
                                        {isActive && <Ionicons name="radio-button-on" size={16} color="#C5A059" />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </TouchableOpacity>
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
                        onLoadEnd={() => {
                            console.log('[WebView] Page load ended:', resolvedUri);
                            webViewRef.current?.injectJavaScript(`
                                if (typeof reportMetrics === 'function') reportMetrics();
                                if (typeof checkFonts === 'function') checkFonts();
                                ${route.params?.targetPage ? `if (typeof window.scrollToPage === 'function') { window.scrollToPage(${route.params.targetPage}); }` : ''}
                                true;
                            `);
                        }}
                        onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.warn('[WebView] Load error: ', nativeEvent);
                        }}
                        // Interrupt auto scroll if user touches to scroll manually
                        onTouchStart={() => {
                            if (isAutoScrolling) {
                                toggleAutoScroll();
                            }
                        }}
                        injectedJavaScriptBeforeContentLoaded={injectCss}
                        injectedJavaScript={getInjectedJs(bookId, route.params?.targetPage)}
                        style={{ flex: 1, backgroundColor: activeTheme.bg }}
                        webviewDebuggingEnabled={true}
                    />
                )}
            </View>

            {/* Minimal Clean Reader Footer (Always visible, matching paper/theme) */}
            <View style={[
                styles.readerFooterBar,
                {
                    backgroundColor: activeTheme.bg,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: isDarkTheme ? '#27272A' : (isSepiaTheme ? '#D4CCB1' : '#E2E8F0')
                }
            ]}>
                <Text style={[styles.footerBarLeft, { color: isDarkTheme ? '#A1A1AA' : '#6B5E4F' }]} numberOfLines={1}>
                    {currentBook?.title || title}
                </Text>
                <Text style={[styles.footerBarCenter, { color: isDarkTheme ? '#A1A1AA' : '#6B5E4F' }]}>
                    {currentChapter ? (() => {
                        const curSoz = currentChapter.startPage + Math.round(pageInfo.current * Math.max(0, currentChapter.pageCount - 1));
                        const mappedRnk = bookId ? getRnkPageFromSozler(bookId, curSoz) : null;
                        if (mappedRnk && mappedRnk !== curSoz) {
                            return `sf. ${curSoz} (RNK: ${mappedRnk})`;
                        }
                        return `${curSoz}/${bookTotalPages}`;
                    })() : ''}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
                    <Text style={[styles.footerBarRight, { color: isDarkTheme ? '#A1A1AA' : '#6B5E4F' }]}>
                        %{Math.round(pageInfo.current * 100)}  {currentTime}
                    </Text>
                    <Ionicons name="time-outline" size={13} color={isDarkTheme ? '#A1A1AA' : '#6B5E4F'} style={{ marginLeft: 3 }} />
                </View>
            </View>

            {/* SÖZLER STYLE FLOATING GRID BUTTON (Izgara Menü Tuşu - Image 2) */}
            {!showFloatingMenu && selectedText.length === 0 && (
                <TouchableOpacity
                    style={styles.floatingGridButton}
                    activeOpacity={0.7}
                    onPress={() => setShowFloatingMenu(true)}
                >
                    <Ionicons name="grid-outline" size={21} color="#FFFFFF" />
                </TouchableOpacity>
            )}

            {/* NEXT SECTION BUTTON */}
            {showNextButton && !isCoverPage && (
                <TouchableOpacity style={styles.nextSectionBtn} onPress={handleNextSection}>
                    <Text style={styles.nextSectionText}>Sonraki Bölüm: {nextChapter?.title || ''}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            )}

            {/* SÖZLER STYLE FLOATING MENU (Matches Reference Screenshot) */}
            {showFloatingMenu && (
                <TouchableOpacity
                    style={styles.floatingMenuBackdrop}
                    activeOpacity={1}
                    onPress={() => setShowFloatingMenu(false)}
                >
                    <View style={styles.floatingMenuContainer} onStartShouldSetResponder={() => true}>
                        {/* 1. İçindekiler */}
                        {currentBook && (
                            <TouchableOpacity
                                style={styles.floatingMenuPill}
                                activeOpacity={0.8}
                                onPress={() => { setShowFloatingMenu(false); setTocVisible(true); }}
                            >
                                <Text style={styles.floatingMenuPillText}>İçindekiler</Text>
                                <Ionicons name="list" size={22} color="#C5A059" />
                            </TouchableOpacity>
                        )}

                        {/* 2. Sayfaya Git */}
                        {currentBook && (
                            <TouchableOpacity
                                style={styles.floatingMenuPill}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setShowFloatingMenu(false);
                                    setTargetPageInput("");
                                    setGotoPageModalVisible(true);
                                }}
                            >
                                <Text style={styles.floatingMenuPillText}>Sayfaya Git</Text>
                                <Ionicons name="document-text-outline" size={22} color="#C5A059" />
                            </TouchableOpacity>
                        )}

                        {/* 3. Temalar ve Ayarlar */}
                        <TouchableOpacity
                            style={styles.floatingMenuPill}
                            activeOpacity={0.8}
                            onPress={() => { setShowFloatingMenu(false); setSettingsVisible(true); }}
                        >
                            <Text style={styles.floatingMenuPillText}>Temalar ve Ayarlar</Text>
                            <Text style={styles.floatingMenuAaText}>AA</Text>
                        </TouchableOpacity>

                        {/* 4. Kütüphanede Ara & Lügât (Split Row) */}
                        <View style={styles.floatingMenuSplitRow}>
                            <TouchableOpacity
                                style={[styles.floatingMenuPill, { flex: 1.2, marginRight: 8 }]}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setShowFloatingMenu(false);
                                    navigation.navigate('LibraryHome');
                                }}
                            >
                                <Text style={styles.floatingMenuPillText} numberOfLines={1}>Kütüphanede Ara</Text>
                                <Ionicons name="search" size={20} color="#C5A059" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.floatingMenuPill, { flex: 0.9 }]}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setShowFloatingMenu(false);
                                    setDictSearchQuery("");
                                    setSearchModalEntry(null);
                                    setLiveSearchResults([]);
                                    setDictSearchModalVisible(true);
                                }}
                            >
                                <Text style={styles.floatingMenuPillText}>Lügât</Text>
                                <Ionicons name="book-outline" size={20} color="#C5A059" />
                            </TouchableOpacity>
                        </View>

                        {/* 4. Bottom Quick Action Dock (4 Circle Buttons) */}
                        <View style={styles.floatingDockRow}>
                            {/* Akış / Auto Scroll */}
                            <TouchableOpacity
                                style={[styles.dockIconCircle, isAutoScrolling && styles.dockIconCircleActive]}
                                activeOpacity={0.8}
                                onPress={toggleAutoScroll}
                            >
                                <Ionicons
                                    name={isAutoScrolling ? "pause" : "play"}
                                    size={20}
                                    color={isAutoScrolling ? "#EF4444" : "#C5A059"}
                                />
                            </TouchableOpacity>

                            {/* Sayfa İlerleme */}
                            <TouchableOpacity
                                style={styles.dockIconCircle}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setShowFloatingMenu(false);
                                    setProgressionModalVisible(true);
                                }}
                            >
                                <Ionicons name="swap-horizontal-outline" size={22} color="#C5A059" />
                            </TouchableOpacity>

                            {/* Yer İşareti (Bookmark) */}
                            <TouchableOpacity
                                style={[styles.dockIconCircle, isBookmarked && styles.dockIconCircleActive]}
                                activeOpacity={0.8}
                                onPress={handleToggleBookmark}
                            >
                                <Ionicons
                                    name={isBookmarked ? "bookmark" : "bookmark-outline"}
                                    size={20}
                                    color={isBookmarked ? "#D97706" : "#C5A059"}
                                />
                            </TouchableOpacity>

                            {/* Geri Dön / Kitaplar */}
                            <TouchableOpacity
                                style={styles.dockIconCircle}
                                activeOpacity={0.8}
                                onPress={() => navigation.goBack()}
                            >
                                <Ionicons name="book" size={20} color="#C5A059" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            )}

            {/* Floating Back Button for Landscape */}
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

            {/* SAYFA İLERLEME MODAL (Premium Clean White Theme) */}
            <Modal
                visible={progressionModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setProgressionModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setProgressionModalVisible(false)}
                >
                    <View style={styles.lightModalContent}>
                        <View style={styles.lightDragHandle} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={styles.lightModalTitle}>Sayfa İlerleme</Text>
                            <TouchableOpacity onPress={() => setProgressionModalVisible(false)}>
                                <Ionicons name="close-circle" size={26} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        {/* 1. Yukarı Kaydır */}
                        <TouchableOpacity
                            style={styles.lightProgressionOptionRow}
                            activeOpacity={0.7}
                            onPress={() => {
                                setPageProgressionMode('vertical');
                                AsyncStorage.setItem('risale_page_progression_mode', 'vertical');
                                setProgressionModalVisible(false);
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="reorder-four-outline" size={22} color="#64748B" style={{ marginRight: 14 }} />
                                <Text style={styles.lightProgressionOptionText}>Yukarı Kaydır</Text>
                            </View>
                            {pageProgressionMode === 'vertical' && (
                                <Ionicons name="checkmark" size={22} color="#10B981" />
                            )}
                        </TouchableOpacity>

                        {/* 2. Kenara Dokun */}
                        <TouchableOpacity
                            style={[styles.lightProgressionOptionRow, { borderBottomWidth: 0 }]}
                            activeOpacity={0.7}
                            onPress={() => {
                                setPageProgressionMode('tap');
                                AsyncStorage.setItem('risale_page_progression_mode', 'tap');
                                setProgressionModalVisible(false);
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="radio-button-on-outline" size={22} color="#64748B" style={{ marginRight: 14 }} />
                                <Text style={styles.lightProgressionOptionText}>Kenara Dokun</Text>
                            </View>
                            {pageProgressionMode === 'tap' && (
                                <Ionicons name="checkmark" size={22} color="#10B981" />
                            )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* AI OPTIONS MODAL (Dark Theme matching Reference) */}
            <Modal visible={aiModalVisible} transparent animationType="slide" onRequestClose={() => setAiModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAiModalVisible(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.darkModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.dragHandle} />
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="sparkles" size={22} color="#C5A059" style={{ marginRight: 8 }} />
                                <Text style={styles.darkModalTitle}>Nuri Abi'ye Sor</Text>
                            </View>
                            <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                                <Ionicons name="close-circle" size={26} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: '#A1A1AA', marginBottom: 16, fontSize: 13 }}>
                            Seçili metinle ilgili ne yapmak istersiniz?
                        </Text>

                        <View style={[styles.separator, { backgroundColor: '#3F3F46' }]} />

                        <TouchableOpacity style={styles.aiOptionBtn} onPress={() => {
                            const query = `Şu metni analiz et. \n1. Eğer metin BIR AYET veya HADIS ise (Tamamen Arapça): Önce **TAM MEALİNİ** yaz. Sonra (varsa) içindeki zor kelimeleri listele.\n2. Eğer metin Osmanlıca/Türkçe bir ibare veya tamlama ise (Örn: Kadîr-i Rahîm, Şakîlerin şerrinden): BÜTÜN olarak manasını açıkla ("Kadîr-i Rahîm: Hem kudretli hem merhametli..." gibi). Sadece kelime kelime bölme.\n\nUYARI: Osmanlıca kelimeler Arapça değildir, "Metin Arapça" deme.\n\nKonuşma dili kullanma, direkt cevabı ver.\n\nMetin:\n"${selectedText}"`;
                            setAiModalVisible(false);
                            setSelectedText("");
                            setTimeout(() => {
                                webViewRef.current?.injectJavaScript(`window.resetSelectionAPI(); true;`);
                            }, 100);
                            navigation.navigate('GeminiChat', { initialQuery: query });
                        }}>
                            <View style={[styles.aiIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.2)' }]}>
                                <Ionicons name="book-outline" size={24} color="#38BDF8" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.aiOptionTitle, { color: '#F4F4F5' }]}>Kelime Manaları</Text>
                                <Text style={[styles.aiOptionDesc, { color: '#A1A1AA' }]}>Seçili metindeki bilinmeyen kelimeleri açıkla</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#71717A" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.aiOptionBtn} onPress={() => {
                            const query = `Bu metinle ilgili ayet ve hadis bağlantıları nelerdir? \nEğer metin bizzat ayet/hadis ise kaynağını ve mealini göster. \nEğer Risale-i Nur metni ise, dayandığı ayet/hadisleri açıkla.\n\nMetin:\n"${selectedText}"`;
                            setAiModalVisible(false);
                            setSelectedText("");
                            setTimeout(() => {
                                webViewRef.current?.injectJavaScript(`window.resetSelectionAPI(); true;`);
                            }, 100);
                            navigation.navigate('GeminiChat', { initialQuery: query });
                        }}>
                            <View style={[styles.aiIconBox, { backgroundColor: 'rgba(22, 163, 74, 0.2)' }]}>
                                <Ionicons name="leaf-outline" size={24} color="#4ADE80" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.aiOptionTitle, { color: '#F4F4F5' }]}>Ayet & Hadis Bağlantısı</Text>
                                <Text style={[styles.aiOptionDesc, { color: '#A1A1AA' }]}>İlgili ayet ve hadis kaynaklarını göster</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#71717A" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.aiOptionBtn} onPress={() => {
                            const query = `Şu metni maddeler halinde özetleyip, Risale-i Nur külliyatındaki yeri bağlamında izah eder misin:\n\n"${selectedText}"`;
                            setAiModalVisible(false);
                            setSelectedText("");
                            setTimeout(() => {
                                webViewRef.current?.injectJavaScript(`window.resetSelectionAPI(); true;`);
                            }, 100);
                            navigation.navigate('GeminiChat', { initialQuery: query });
                        }}>
                            <View style={[styles.aiIconBox, { backgroundColor: 'rgba(217, 119, 6, 0.2)' }]}>
                                <Ionicons name="list-outline" size={24} color="#FBBF24" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.aiOptionTitle, { color: '#F4F4F5' }]}>Özetle ve İzah Et</Text>
                                <Text style={[styles.aiOptionDesc, { color: '#A1A1AA' }]}>Metni özetle ve ana fikrini açıkla</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#71717A" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.aiOptionBtn} onPress={() => {
                            const query = `Şu metinden çalışma veya tefekkür soruları çıkar:\n\n"${selectedText}"`;
                            setAiModalVisible(false);
                            setSelectedText("");
                            setTimeout(() => {
                                webViewRef.current?.injectJavaScript(`window.resetSelectionAPI(); true;`);
                            }, 100);
                            navigation.navigate('GeminiChat', { initialQuery: query });
                        }}>
                            <View style={[styles.aiIconBox, { backgroundColor: 'rgba(124, 58, 237, 0.2)' }]}>
                                <Ionicons name="chatbubbles-outline" size={24} color="#C084FC" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.aiOptionTitle, { color: '#F4F4F5' }]}>Sohbet / Ders</Text>
                                <Text style={[styles.aiOptionDesc, { color: '#A1A1AA' }]}>Konu üzerine interaktif sohbet</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#71717A" />
                        </TouchableOpacity>

                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* SETTINGS MODAL (Premium Clean White Theme) */}
            <Modal visible={settingsVisible} animationType="slide" transparent onRequestClose={() => setSettingsVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSettingsVisible(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.lightModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.lightDragHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.lightModalTitle}>Okuma Ayarları</Text>
                            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                                <Ionicons name="close-circle" size={28} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.separator, { backgroundColor: '#E2E8F0' }]} />

                        <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled={true} style={{ maxHeight: 520, paddingRight: 4 }}>
                            {/* Font Size */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: '#0F172A' }]}>Yazı Boyutu</Text>
                                <View style={styles.fontSizeControls}>
                                    <TouchableOpacity style={[styles.fontSizeBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }]} onPress={() => updateSetting('fontSize', Math.max(MIN_FONT_SIZE, fontSize - FONT_STEP))}>
                                        <Text style={[styles.fontSizeBtnText, { color: '#0F172A' }]}>A−</Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.fontSizeValue, { color: '#0F172A' }]}>{fontSize}</Text>
                                    <TouchableOpacity style={[styles.fontSizeBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }]} onPress={() => updateSetting('fontSize', Math.min(MAX_FONT_SIZE, fontSize + FONT_STEP))}>
                                        <Text style={[styles.fontSizeBtnText, { color: '#0F172A' }]}>A+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Theme */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: '#0F172A' }]}>Tema</Text>
                            </View>
                            <View style={styles.colorRow}>
                                {THEME_OPTIONS.map(t => (
                                    <TouchableOpacity
                                        key={t.id}
                                        onPress={() => updateSetting('themeId', t.id)}
                                        style={[
                                            styles.colorCircle,
                                            { backgroundColor: t.bg, borderColor: themeId === t.id ? '#C5A059' : '#CBD5E1' },
                                            themeId === t.id && styles.colorCircleActive
                                        ]}
                                    />
                                ))}
                            </View>

                            {/* Font Family */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: '#0F172A' }]}>Yazı Tipi</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                {FONT_OPTIONS.map(f => {
                                    const active = f.id === fontFamily;
                                    return (
                                        <TouchableOpacity
                                            key={f.id}
                                            style={[styles.chip, { backgroundColor: active ? '#C5A059' : '#F8FAFC', borderColor: active ? '#B45309' : '#E2E8F0' }]}
                                            onPress={() => updateSetting('fontFamily', f.id)}
                                        >
                                            <Text style={[styles.chipText, { color: active ? '#FFFFFF' : '#334155', fontWeight: active ? '700' : '500' }]}>{f.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* Text Align */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: '#0F172A' }]}>Hizalama</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                {ALIGN_OPTIONS.map(a => {
                                    const active = a.id === textAlign;
                                    return (
                                        <TouchableOpacity
                                            key={a.id}
                                            style={[styles.chip, { backgroundColor: active ? '#C5A059' : '#F8FAFC', borderColor: active ? '#B45309' : '#E2E8F0' }]}
                                            onPress={() => updateSetting('textAlign', a.id)}
                                        >
                                            <Text style={[styles.chipText, { color: active ? '#FFFFFF' : '#334155', fontWeight: active ? '700' : '500' }]}>{a.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Line Height */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: '#0F172A' }]}>Satır Aralığı</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                                {LINE_HEIGHT_OPTIONS.map(l => {
                                    const active = l.id === lineHeight;
                                    return (
                                        <TouchableOpacity
                                            key={l.id}
                                            style={[styles.chip, { backgroundColor: active ? '#C5A059' : '#F8FAFC', borderColor: active ? '#B45309' : '#E2E8F0' }]}
                                            onPress={() => updateSetting('lineHeight', l.id)}
                                        >
                                            <Text style={[styles.chipText, { color: active ? '#FFFFFF' : '#334155', fontWeight: active ? '700' : '500' }]}>{l.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Auto Scroll Modülü */}
                            <View style={[styles.separator, { backgroundColor: '#E2E8F0' }]} />
                            <View style={[styles.settingRow, { marginBottom: 16 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                        <Ionicons name="swap-vertical" size={18} color="#C5A059" />
                                    </View>
                                    <View>
                                        <Text style={[styles.settingLabel, { color: '#0F172A' }]}>Akış Modu</Text>
                                        <Text style={{ fontSize: 12, color: '#64748B' }}>Otomatik ekran kaydırma</Text>
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
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                                        {isAutoScrolling ? 'Durdur' : 'Başlat'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Speed Controls */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
                                <TouchableOpacity onPress={() => updateSetting('autoScrollSpeed', Math.max(0.5, autoScrollSpeed - 0.5))} style={[styles.asBtn, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}>
                                    <Ionicons name="remove" size={20} color="#0F172A" />
                                </TouchableOpacity>

                                <View style={{ alignItems: 'center', width: 60 }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0F172A' }}>{autoScrollSpeed.toFixed(1)}x</Text>
                                    <Text style={{ fontSize: 10, color: '#64748B' }}>Hız</Text>
                                </View>

                                <TouchableOpacity onPress={() => updateSetting('autoScrollSpeed', Math.min(5, autoScrollSpeed + 0.5))} style={[styles.asBtn, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}>
                                    <Ionicons name="add" size={20} color="#0F172A" />
                                </TouchableOpacity>
                            </View>

                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* FOOTNOTE MODAL (Risale Book Warm Theme) */}
            <Modal visible={footnoteVisible} transparent animationType="slide" onRequestClose={() => setFootnoteVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFootnoteVisible(false)}>
                    <View style={styles.bookModalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.bookDragHandle} />
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(197, 160, 89, 0.18)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                                    <Ionicons name="information-circle" size={20} color="#B45309" />
                                </View>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1C1917' }}>Hâşiye / Dipnot</Text>
                            </View>
                            <TouchableOpacity onPress={() => setFootnoteVisible(false)} style={{ padding: 4 }}>
                                <Ionicons name="close-circle" size={28} color="#78716C" />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.separator, { backgroundColor: '#E7E5E4' }]} />
                        <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingBottom: 30 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true} bounces={true} overScrollMode="always">
                            <Text style={[styles.footNoteText, { color: '#1C1917', lineHeight: 28, fontSize: 17 }]}>{footnoteContent}</Text>
                        </ScrollView>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E7E5E4' }}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F4', borderWidth: 1, borderColor: '#E7E5E4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                                onPress={() => {
                                    Clipboard.setString(footnoteContent);
                                    Alert.alert('✅', 'Hâşiye panoya kopyalandı');
                                }}
                            >
                                <Ionicons name="copy-outline" size={16} color="#292524" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 13, color: '#292524', fontWeight: '600' }}>Kopyala</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* AYET & HADİS MEALİ MODAL (Risale Book Warm Theme with Tabs) */}
            <Modal visible={mealModalVisible} transparent animationType="slide" onRequestClose={() => setMealModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMealModalVisible(false)}>
                    <View style={styles.bookModalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.bookDragHandle} />

                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Âyet-i Kerîme / Hadîs-i Şerîf Meâli
                                </Text>
                                {activeMeal?.source ? (
                                    <Text style={{ fontSize: 13, color: '#78716C', marginTop: 2, fontStyle: 'italic' }}>
                                        {activeMeal.source}
                                    </Text>
                                ) : null}
                            </View>
                            <TouchableOpacity onPress={() => setMealModalVisible(false)} style={{ padding: 4 }}>
                                <Ionicons name="close-circle" size={28} color="#78716C" />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs: [ 📖 Türkçe Meâl ] | [ 📜 Arapça Metin ] */}
                        <View style={{ flexDirection: 'row', backgroundColor: '#E7E5E4', borderRadius: 10, padding: 3, marginBottom: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    backgroundColor: mealTab === 'meal' ? '#FFFFFF' : 'transparent',
                                    shadowColor: mealTab === 'meal' ? '#000' : 'transparent',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 2,
                                    elevation: mealTab === 'meal' ? 2 : 0,
                                }}
                                onPress={() => setMealTab('meal')}
                            >
                                <Text style={{ fontSize: 14, fontWeight: mealTab === 'meal' ? '700' : '500', color: mealTab === 'meal' ? '#B45309' : '#57534E' }}>
                                    📖 Türkçe Meâl
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    backgroundColor: mealTab === 'arabic' ? '#FFFFFF' : 'transparent',
                                    shadowColor: mealTab === 'arabic' ? '#000' : 'transparent',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 2,
                                    elevation: mealTab === 'arabic' ? 2 : 0,
                                }}
                                onPress={() => setMealTab('arabic')}
                            >
                                <Text style={{ fontSize: 14, fontWeight: mealTab === 'arabic' ? '700' : '500', color: mealTab === 'arabic' ? '#B45309' : '#57534E' }}>
                                    📜 Arapça Metin
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.separator, { backgroundColor: '#E7E5E4', marginBottom: 12 }]} />

                        {/* Tab Content - Smooth scrollable */}
                        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true} bounces={true} overScrollMode="always">
                            {mealTab === 'meal' ? (
                                <Text style={{ fontSize: 17, color: '#1C1917', lineHeight: 28, textAlign: 'justify', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}>
                                    {activeMeal?.meal}
                                </Text>
                            ) : (
                                <Text style={{ fontSize: 24, color: '#8B0000', textAlign: 'center', lineHeight: 42, fontFamily: 'ScheherazadeNew' }}>
                                    {activeMeal?.arabic}
                                </Text>
                            )}
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E7E5E4' }}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F4', borderWidth: 1, borderColor: '#E7E5E4', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
                                onPress={() => {
                                    if (activeMeal) {
                                        Clipboard.setString(`${activeMeal.arabic ? activeMeal.arabic + '\n\n' : ''}${activeMeal.meal}\n\nKaynak: ${activeMeal.source || 'Risale-i Nur'}`);
                                        Alert.alert('✅', 'Meâl panoya kopyalandı');
                                    }
                                }}
                            >
                                <Ionicons name="copy-outline" size={16} color="#292524" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 13, color: '#292524', fontWeight: '600' }}>Kopyala</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#C5A059', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                                onPress={() => {
                                    if (activeMeal) {
                                        Share.share({ message: `${activeMeal.arabic ? activeMeal.arabic + '\n\n' : ''}${activeMeal.meal}\n\nKaynak: ${activeMeal.source || 'Risale-i Nur'}` });
                                    }
                                }}
                            >
                                <Ionicons name="share-social-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '700' }}>Paylaş</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* 1. DICTIONARY MODAL (Word Tap - Spacious Original Light Modal) */}
            <Modal visible={dictVisible} transparent animationType="fade" onRequestClose={() => setDictVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDictVisible(false)}>
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
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
                                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={true}>
                                    <Text style={styles.dictDef}>{dictEntry.definition}</Text>
                                </ScrollView>
                                {dictCandidates.length > 0 && (
                                    <TouchableOpacity
                                        style={{ marginTop: 14, padding: 10, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8 }}
                                        onPress={() => setDictEntry(null)}
                                    >
                                        <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600' }}>← Diğer Sonuçlara Dön</Text>
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
                                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={true}>
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
                                    <Ionicons name="alert-circle-outline" size={42} color="#cbd5e1" />
                                    <Text style={{ fontSize: 16, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
                                        Lügatta bulunamadı: "{searchedWord}"
                                    </Text>
                                </View>

                                {suggestionsLoading && (
                                    <View style={{ alignItems: 'center', padding: 12 }}>
                                        <ActivityIndicator size="small" color="#C5A059" />
                                        <Text style={{ marginTop: 6, color: '#94a3b8', fontSize: 13 }}>Öneriler aranıyor...</Text>
                                    </View>
                                )}

                                {!suggestionsLoading && localSuggestions.length > 0 && (
                                    <View>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 10 }}>Öneriler:</Text>
                                        {localSuggestions.map((sug, i) => (
                                            <TouchableOpacity
                                                key={i}
                                                style={[styles.candItem, { paddingVertical: 8 }]}
                                                onPress={() => setDictEntry(sug.entry)}
                                            >
                                                <Text style={{ fontSize: 15, color: '#1E293B' }}>{sug.entry.word_tr}</Text>
                                                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={{
                                        marginTop: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#F8FAFC',
                                        borderWidth: 1,
                                        borderColor: '#E2E8F0',
                                        padding: 12,
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
                                    <Text style={{ color: '#475569', fontWeight: '600' }}>Google'da Ara</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{ marginTop: 12, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, alignItems: 'center' }}
                                    onPress={() => setDictVisible(false)}
                                >
                                    <Text style={{ color: '#334155', fontWeight: '600' }}>Kapat</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* 2. DEDICATED KÜLLİYAT LÜGATİ SEARCH MODAL (Spacious & Responsive) */}
            <Modal visible={dictSearchModalVisible} transparent animationType="slide" onRequestClose={() => setDictSearchModalVisible(false)}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                    style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDictSearchModalVisible(false)} />
                    <View style={styles.dictModalContent}>
                        <View style={styles.lightDragHandle} />

                        {/* Modal Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                                    <Ionicons name="book" size={20} color="#C5A059" />
                                </View>
                                <View>
                                    <Text style={[styles.lightModalTitle, { fontSize: 17 }]}>120.000+ Kelimelik Külliyat Lügati</Text>
                                    <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>Canlı Arama ve Osmanlıca İzahlar</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setDictSearchModalVisible(false)} style={{ padding: 4 }}>
                                <Ionicons name="close-circle" size={28} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        {/* Search Input Box */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#F8FAFC',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: Platform.OS === 'ios' ? 10 : 8,
                            marginBottom: 12,
                            borderWidth: 1.5,
                            borderColor: '#E2E8F0'
                        }}>
                            <Ionicons name="search" size={20} color="#C5A059" style={{ marginRight: 8 }} />
                            <TextInput
                                style={{ flex: 1, color: '#0F172A', fontSize: 16, padding: 0 }}
                                placeholder="Kelime veya tabir arayın..."
                                placeholderTextColor="#94A3B8"
                                value={dictSearchQuery}
                                onChangeText={handleDictSearchChange}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoFocus={true}
                                returnKeyType="search"
                            />
                            {isSearchingDict ? (
                                <ActivityIndicator size="small" color="#C5A059" style={{ marginRight: 4 }} />
                            ) : null}
                            {dictSearchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => {
                                    setDictSearchQuery("");
                                    setLiveSearchResults([]);
                                    setSearchModalEntry(null);
                                }} style={{ padding: 4 }}>
                                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* 1. DETAIL VIEW */}
                        {searchModalEntry ? (
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}
                                        onPress={() => setSearchModalEntry(null)}
                                    >
                                        <Ionicons name="arrow-back" size={16} color="#C5A059" style={{ marginRight: 6 }} />
                                        <Text style={{ color: '#C5A059', fontSize: 13, fontWeight: '700' }}>Sonuçlara Dön</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', padding: 6 }}
                                        onPress={async () => {
                                            try {
                                                const url = `https://www.google.com/search?q=${encodeURIComponent(searchModalEntry.word_tr + " nedir risale")}`;
                                                await Linking.openURL(url);
                                            } catch (e) {}
                                        }}
                                    >
                                        <Ionicons name="logo-google" size={16} color="#94A3B8" style={{ marginRight: 4 }} />
                                        <Text style={{ fontSize: 12, color: '#94A3B8' }}>Google</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
                                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0F172A', flex: 1 }}>{searchModalEntry.word_tr}</Text>
                                    {searchModalEntry.word_osm ? (
                                        <Text style={{ fontSize: 28, color: '#B45309', fontFamily: 'ScheherazadeNew', marginLeft: 12 }}>
                                            {searchModalEntry.word_osm}
                                        </Text>
                                    ) : null}
                                </View>

                                <View style={[styles.separator, { backgroundColor: '#E2E8F0', marginVertical: 8 }]} />

                                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true} contentContainerStyle={{ paddingBottom: 24 }}>
                                    <Text style={[styles.dictDef, { color: '#334155', lineHeight: 28, fontSize: 16 }]}>
                                        {searchModalEntry.definition}
                                    </Text>
                                </ScrollView>
                            </View>
                        ) : liveSearchResults.length > 0 ? (
                            /* 2. SEARCH RESULTS LIST (Spacious, full height) */
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 }}>
                                    <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>
                                        Bulunan {liveSearchResults.length} kelime:
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                                        Detay için kelimeye dokunun
                                    </Text>
                                </View>
                                <ScrollView 
                                    style={{ flex: 1 }} 
                                    showsVerticalScrollIndicator={true} 
                                    nestedScrollEnabled={true}
                                    keyboardShouldPersistTaps="handled"
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                >
                                    {liveSearchResults.map((entry, i) => (
                                        <TouchableOpacity
                                            key={entry.id || i}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                paddingVertical: 12,
                                                paddingHorizontal: 8,
                                                borderRadius: 8,
                                                borderBottomWidth: 1,
                                                borderBottomColor: '#F1F5F9',
                                                backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                                            }}
                                            onPress={() => setSearchModalEntry(entry)}
                                        >
                                            <View style={{ flex: 1, paddingRight: 12 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{entry.word_tr}</Text>
                                                </View>
                                                {entry.definition ? (
                                                    <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 }} numberOfLines={2}>
                                                        {entry.definition}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                {entry.word_osm ? (
                                                    <Text style={{ fontSize: 20, color: '#B45309', fontFamily: 'ScheherazadeNew', marginBottom: 4 }}>
                                                        {entry.word_osm}
                                                    </Text>
                                                ) : null}
                                                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : dictSearchQuery.trim().length > 0 ? (
                            /* 3. NOT FOUND */
                            <View style={{ padding: 24, alignItems: 'center' }}>
                                <Ionicons name="alert-circle-outline" size={44} color="#CBD5E1" />
                                <Text style={{ fontSize: 16, color: '#64748B', marginTop: 10, textAlign: 'center' }}>
                                    Lügatta bulunamadı: "{dictSearchQuery}"
                                </Text>
                                <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center' }}>
                                    Farklı bir kök veya Osmanlıca imlâ ile arayabilir veya internette bulabilirsiniz.
                                </Text>
                                <TouchableOpacity
                                    style={{
                                        marginTop: 18,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#F8FAFC',
                                        borderWidth: 1,
                                        borderColor: '#E2E8F0',
                                        paddingHorizontal: 20,
                                        paddingVertical: 12,
                                        borderRadius: 10
                                    }}
                                    onPress={async () => {
                                        try {
                                            const url = `https://www.google.com/search?q=${encodeURIComponent(dictSearchQuery + " nedir risale")}`;
                                            await Linking.openURL(url);
                                        } catch (e) {
                                            console.warn('[Lugat] Could not open browser:', e);
                                        }
                                    }}
                                >
                                    <Ionicons name="logo-google" size={18} color="#C5A059" style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#334155', fontWeight: '600' }}>Google'da Detaylı Ara</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* 4. INITIAL PROMPT */
                            <View style={{ padding: 28, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="search-outline" size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
                                <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
                                    Külliyat Arama Motoru
                                </Text>
                                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 6, textAlign: 'center', lineHeight: 20, maxWidth: 300 }}>
                                    Aramak istediğiniz kelime veya tabiri yukarıdaki kutucuğa yazın. Anlık olarak 120.000 kelime taranır ve listelenir.
                                </Text>
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* 3. SAYFAYA GİT (GO TO PAGE) MODAL */}
            <Modal visible={gotoPageModalVisible} transparent animationType="slide" onRequestClose={() => setGotoPageModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGotoPageModalVisible(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.lightModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.lightDragHandle} />

                        {/* Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                                    <Ionicons name="document-text" size={19} color="#C5A059" />
                                </View>
                                <View>
                                    <Text style={styles.lightModalTitle}>Sayfaya Git</Text>
                                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                                        {currentBook?.title || 'Kitap'} (1 - {gotoEdition === 'rnk' && rnkBookTotalPages ? rnkBookTotalPages : bookTotalPages})
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setGotoPageModalVisible(false)} style={{ padding: 4 }}>
                                <Ionicons name="close-circle" size={26} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        {/* Edition Selector Tabs */}
                        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 3, marginBottom: 14 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 9,
                                    borderRadius: 9,
                                    backgroundColor: gotoEdition === 'sozler' ? '#FFFFFF' : 'transparent',
                                    alignItems: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: gotoEdition === 'sozler' ? 0.08 : 0,
                                    shadowRadius: 2,
                                    elevation: gotoEdition === 'sozler' ? 2 : 0,
                                }}
                                onPress={() => setGotoEdition('sozler')}
                            >
                                <Text style={{ fontSize: 13, fontWeight: gotoEdition === 'sozler' ? '700' : '500', color: gotoEdition === 'sozler' ? '#0F172A' : '#64748B' }}>
                                    Sözler Neşriyat
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 9,
                                    borderRadius: 9,
                                    backgroundColor: gotoEdition === 'rnk' ? '#FFFFFF' : 'transparent',
                                    alignItems: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: gotoEdition === 'rnk' ? 0.08 : 0,
                                    shadowRadius: 2,
                                    elevation: gotoEdition === 'rnk' ? 2 : 0,
                                }}
                                onPress={() => setGotoEdition('rnk')}
                            >
                                <Text style={{ fontSize: 13, fontWeight: gotoEdition === 'rnk' ? '700' : '500', color: gotoEdition === 'rnk' ? '#0F172A' : '#64748B' }}>
                                    RNK Neşriyat
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Page Input Box */}
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginVertical: 10,
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            backgroundColor: '#F8FAFC',
                            borderRadius: 16,
                            borderWidth: 1.5,
                            borderColor: '#C5A059'
                        }}>
                            <TextInput
                                style={{
                                    fontSize: 36,
                                    fontWeight: 'bold',
                                    color: '#0F172A',
                                    textAlign: 'center',
                                    minWidth: 120,
                                    padding: 4
                                }}
                                placeholder={(() => {
                                    if (!currentChapter) return "1";
                                    const curSoz = currentChapter.startPage + Math.round(pageInfo.current * Math.max(0, currentChapter.pageCount - 1));
                                    if (gotoEdition === 'rnk' && bookId) {
                                        return String(getRnkPageFromSozler(bookId, curSoz));
                                    }
                                    return String(curSoz);
                                })()}
                                placeholderTextColor="#CBD5E1"
                                value={targetPageInput}
                                onChangeText={setTargetPageInput}
                                keyboardType="number-pad"
                                maxLength={4}
                                autoFocus={true}
                                returnKeyType="go"
                                onSubmitEditing={() => handleGotoPage(targetPageInput)}
                            />
                            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                {gotoEdition === 'rnk' ? 'RNK Neşriyat sayfa numarasını girin' : 'Sözler Neşriyat sayfa numarasını girin'}
                            </Text>

                            {/* Dynamic RNK to Sözler Live Conversion Banner */}
                            {gotoEdition === 'rnk' && targetPageInput.trim().length > 0 && (() => {
                                const rnkP = parseInt(targetPageInput.trim(), 10);
                                if (!isNaN(rnkP) && rnkP > 0) {
                                    const mappedSozlerP = bookId ? getSozlerPageFromRnk(bookId, rnkP) : rnkP;
                                    return (
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: '#FEF3C7',
                                            borderWidth: 1,
                                            borderColor: '#FDE68A',
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            paddingVertical: 9,
                                            marginTop: 10,
                                            width: '100%'
                                        }}>
                                            <Ionicons name="swap-horizontal" size={17} color="#B45309" style={{ marginRight: 8 }} />
                                            <Text style={{ fontSize: 12.5, color: '#92400E', fontWeight: '600', flexShrink: 1 }}>
                                                💡 Bu sayfa Sözler Neşriyat'ta <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>sf. {mappedSozlerP}</Text>'e denk gelir.
                                            </Text>
                                        </View>
                                    );
                                }
                                return null;
                            })()}
                        </View>

                        {/* Quick Step Buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
                            {[-10, -1, 1, 10].map((step) => {
                                const curSoz = currentChapter ? (currentChapter.startPage + Math.round(pageInfo.current * Math.max(0, currentChapter.pageCount - 1))) : 1;
                                const maxLimit = (gotoEdition === 'rnk' && rnkBookTotalPages ? rnkBookTotalPages : (bookTotalPages || 9999));
                                const curActiveP = (gotoEdition === 'rnk' && bookId) ? getRnkPageFromSozler(bookId, curSoz) : curSoz;
                                const base = targetPageInput ? (parseInt(targetPageInput, 10) || curActiveP) : curActiveP;
                                const newP = Math.max(1, Math.min(maxLimit, base + step));
                                return (
                                    <TouchableOpacity
                                        key={step}
                                        style={{
                                            paddingHorizontal: 14,
                                            paddingVertical: 8,
                                            backgroundColor: '#F1F5F9',
                                            borderRadius: 20,
                                            borderWidth: 1,
                                            borderColor: '#E2E8F0'
                                        }}
                                        onPress={() => setTargetPageInput(String(newP))}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                                            {step > 0 ? `+${step}` : `${step}`}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Action Go Button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#C5A059',
                                paddingVertical: 14,
                                borderRadius: 14,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: '#C5A059',
                                shadowOffset: { width: 0, height: 3 },
                                shadowOpacity: 0.3,
                                shadowRadius: 5,
                                elevation: 4
                            }}
                            onPress={() => handleGotoPage(targetPageInput)}
                        >
                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginRight: 8 }}>
                                {gotoEdition === 'rnk' ? 'RNK Sayfasına Git' : 'Sayfaya Git'}
                            </Text>
                            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent'
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

    // Action Bar (Floating dock with gold accents)
    actionBar: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        flexDirection: 'row',
        backgroundColor: 'rgba(28, 28, 30, 0.95)',
        borderRadius: 24,
        paddingHorizontal: 10,
        paddingVertical: 8,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        zIndex: 999,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(197, 160, 89, 0.35)',
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
        minHeight: 280,
        maxHeight: '82%',
        flexShrink: 1,
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
    },

    // Risale-i Nur Book Warm Theme Modal Styles (Matching reader page theme)
    bookModalContent: {
        backgroundColor: '#FBF9F4',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        minHeight: 280,
        maxHeight: '86%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#E7E5E4',
    },
    bookDragHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#D6D3D1',
        alignSelf: 'center',
        marginBottom: 16,
    },

    // Dark Modal Styles (Matching Reference Screenshots 1, 2, 3)
    darkModalContent: {
        backgroundColor: '#262628',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 36,
        minHeight: 260,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 10,
    },
    dragHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#52525B',
        alignSelf: 'center',
        marginBottom: 16,
    },
    darkModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F4F4F5',
    },

    // Premium Clean Light Modal Styles
    lightModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 36,
        minHeight: 260,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
    },
    dictModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        height: '88%',
        maxHeight: '94%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
    },
    lightDragHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#CBD5E1',
        alignSelf: 'center',
        marginBottom: 16,
    },
    lightModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    lightProgressionOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    lightProgressionOptionText: {
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '500',
    },

    // Sayfa İlerleme Modal
    progressionModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F4F4F5',
        marginBottom: 16,
    },
    progressionOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#333336',
    },
    progressionOptionText: {
        fontSize: 16,
        color: '#F4F4F5',
        fontWeight: '500',
    },

    // Floating Grid Button (Izgara Menü Tuşu - Image 2)
    floatingGridButton: {
        position: 'absolute',
        bottom: 42,
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 0, 0, 0.28)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },

    // Floating Menu Styles (Reference Screenshot 3 & user image)
    floatingMenuBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'flex-end',
        zIndex: 900,
    },
    floatingMenuContainer: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 10,
    },
    floatingMenuPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(30, 30, 32, 0.94)',
        borderRadius: 28,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    floatingMenuPillText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F4F4F5',
    },
    floatingMenuAaText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#C5A059',
        fontFamily: 'serif',
    },
    floatingMenuSplitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    floatingDockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: 'rgba(30, 30, 32, 0.94)',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        marginHorizontal: 8,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    dockIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dockIconCircleActive: {
        backgroundColor: 'rgba(197, 160, 89, 0.25)',
        borderWidth: 1,
        borderColor: '#C5A059',
    },

    // Reader Minimal Footer Bar (matching Sözler reader)
    readerFooterBar: {
        height: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: 'transparent',
    },
    footerBarLeft: {
        fontSize: 12,
        color: '#A1A1AA',
        maxWidth: '50%',
    },
    footerBarCenter: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '500',
    },
    footerBarRight: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '500',
    }
});
