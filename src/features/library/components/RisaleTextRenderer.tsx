import React, { memo, useCallback, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

/**
 * RisaleTextRenderer (Golden Standard V20.0 - LOCKED)
 * ─────────────────────────────────────────────────────────────
 * FINALIZED TYPOGRAPHY & LAYOUT RULES (User Approved: 2026-01-11):
 * 1. Android: textAlign 'left' | iOS: 'justify'
 * 2. Paragraphs: Indented (6 spaces)
 * 3. Arabic Font: 'Scheherazade New' (Google Font)
 *    - Block Scale: 1.6x | LineHeight: 1.8x | MarginV: 4 | Padding: V6
 *    - Inline Scale: 1.25x | LineHeight: 2.2x | Padding: T10 B4
 *    - Character Fix: \u0656 -> \u0650 (Subscript Aleph -> Kasra)
 * 4. Semantics:
 *    - Sacred Names: Bold Black (Includes Zikr terms like Elhamdülillah, Vesselam...)
 *    - Sual/Elcevap Labels: Bold, Body Size, Black
 *    - Question Content: Bold Italic Black
 * ─────────────────────────────────────────────────────────────
 */

type Props = {
    text: string;
    fontSize: number;
    color?: string;
    isAfterSual?: boolean; // Premium V20: Previous chunk was standalone "Sual:"
    onWordPress?: (word: string, pageY: number, prev?: string, next?: string) => void;
    onWordLongPress?: (word: string) => void;
    arabicColor?: string; // default RNK kırmızısı
    interactiveEnabled?: boolean; // Scroll Optimization: Disable interactions during scroll
};

const RNK_ARABIC = "#B3261E";

const RE_ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const RE_ARABIC_RUN = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/g;

// <ar>...</ar> tag support
const RE_AR_TAG = /<ar>([\s\S]*?)<\/ar>/gi;

// SMART HEADER DETECTION (Pattern Matching - WhiteList Structural Logic) v21.0
const RE_NUMBERS = /(Birinci|İkinci|Üçüncü|Dördüncü|Beşinci|Altıncı|Yedinci|Sekizinci|Dokuzuncu|Onuncu|Yirminci|Otuzuncu|Kırkıncı|Ellinci|Altmışıncı|Yetmişinci|Sekseninci|Doksanınca|Yüzüncü|\d+\.?)/i;
const RE_TYPES = /(Söz|Mektup|Lem'a|Lem’a|Şua|Nükte|Mebhas|İşaret|Zeyl|Mes'ele|Mesele|Nokta|Hatve|Remiz|Reşha|Sır|Esas|Vecih|Sebep|Hikmet|Düstur|Temsil|Makale|Fıkra|Levha|Sual|Elcevap)/i;
const RE_STANDALONE = /^(Mukaddime|Hâtime|Hatıra|Takdim|İfade|Başlangıç|İhtar|Tenbih|Sözler|Mektubat|Lem'alar|Şualar|Lahika|Fihrist|Münderecat)$/i;

export function isHeadingLine(t: string): boolean {
    const s = t.trim();
    if (!s) return false;

    // 1. Safety Filters (Exclude obvious paragraphs)
    if (s.length > 150) return false;
    if (s.endsWith('.')) return false; // Sentences end with dot
    if (s.includes(':')) return false; // Definitions/Labels usually have colon (e.g. "Birinci Nokta: ...")

    // 2. Standalone Headers (Exact or special terms)
    if (RE_STANDALONE.test(s)) return true;

    // 3. Composite Headers (Structure: Number + Type)
    // Valid: "Birinci Söz", "İkinci Nükte", "Onuncu Lem'a"
    // Invalid: "Birinci kâr" (No Type), "Birinci adam" (No Type)
    if (RE_NUMBERS.test(s) && RE_TYPES.test(s)) return true;

    return false;
}

function arabicRatio(t: string): number {
    const s = t.trim();
    if (!s) return 0;
    let a = 0;
    for (let i = 0; i < s.length; i++) if (RE_ARABIC.test(s[i])) a++;
    return a / s.length;
}

function isArabicLine(t: string): boolean {
    return arabicRatio(t) >= 0.5;
}

function normalizeLine(raw: string): string {
    // Remove <ar> tags globally.
    // Replace unsupported Subscript Aleph (U+0656) with Kasra (U+0650) to prevent font fallback.
    return raw
        .replace(/<\/?ar>/gi, "")
        .replace(/\u0656/g, "\u0650") // FIX: Husrev font lacks U+0656 support
        .replace(/\r/g, "")
        .replace(/\t/g, " ")
        .trim();
}

/**
 * Decide whether an Arabic run should be INLINE or BLOCK or MINI-BLOCK.
 * Golden rule: if spaces OR >12 chars => BLOCK/MINI-BLOCK.
 */
function shouldArabicBeBlock(ar: string): boolean {
    const s = ar.trim();
    if (!s) return false;
    if (s.includes(" ")) return true; // phrase -> block
    if (s.length > 12) return true;   // long word -> block (prevents line break resizing issues)
    return false;
}

export const RisaleTextRenderer = memo((props: Props) => {
    const {
        text,
        fontSize,
        color = "#000",
        isAfterSual = false,
        onWordPress,
        arabicColor = RNK_ARABIC,
        interactiveEnabled = true, // Default enabled
    } = props;

    const isAndroid = Platform.OS === "android";
    const alignBody = isAndroid ? "left" : "justify";

    // Scaled metrics (Golden Standard)
    const bodyLineHeight = Math.round(fontSize * 1.7);

    // KFGQPC is thinner/smaller, so we increase size slightly
    // Adjusted for Scheherazade New (Refined scale)
    const arabicInlineSize = Math.round(fontSize * 1.25); // Reduced to 1.25
    const arabicBlockSize = Math.max(26, Math.round(fontSize * 1.6)); // Reduced to 1.6
    const arabicBlockLineHeight = Math.round(arabicBlockSize * 1.8); // Tighter line height (was 2.0, caused gaps)

    const headingSize = Math.round(fontSize * 1.8); // INCREASED: 1.35 -> 1.8
    const headingLineHeight = Math.round(headingSize * 1.4);
    const labelSize = fontSize; // Same size as body, strictly bold

    const parsed = useMemo(() => {
        if (!text) return [];
        // Raw split by newline first
        return text.split("\n").map(normalizeLine).filter(Boolean);
    }, [text]);

    // Word press handler - Now captures coordinates and context (Smart Span)
    const handlePress = useCallback((w: string, pageY: number, prev?: string, next?: string) => {
        if (!onWordPress || !interactiveEnabled) return;
        // Normalize: remove punctuation
        const clean = w.replace(/[.,;:!?(){}[\]"']/g, "").toLowerCase();

        // Context cleaning (basic)
        const cleanPrev = prev ? prev.replace(/[.,;:!?(){}[\]"']/g, "").toLowerCase() : undefined;
        const cleanNext = next ? next.replace(/[.,;:!?(){}[\]"']/g, "").toLowerCase() : undefined;

        // Pass coordinates and context up
        onWordPress(clean, pageY, cleanPrev, cleanNext);
    }, [onWordPress, interactiveEnabled]);

    // ─────────────────────────────────────────────────────────────
    // SEMANTIC DETECTORS
    // ─────────────────────────────────────────────────────────────

    // 1. Sual / Elcevap
    // Matches: SUAL:, SUÂL :, ELCEVAP:, EL-CEVAP :, CEVAP:
    // Case insensitive, optional whitespace before colon
    const RE_SUAL_LINE = /^(SU[AÂa]L|EL-?CEVAP|CEVAP)\s*:/i;

    const isSualLine = useCallback((t: string) => {
        return RE_SUAL_LINE.test(t.trim());
    }, []);

    // Helper to detect standalone "Sual:" (ends with colon, no content after)
    const isStandaloneSualChunk = useCallback((text: string) => {
        const trimmed = text.trim();
        const RE_SUAL = /^(SU[AÂa]L|EL-?CEVAP|CEVAP)\s*:$/i;
        return RE_SUAL.test(trimmed);
    }, []);

    // 1b. İhtar / Dikkat / Tenbih / Nükte (Premium V20)
    const RE_IHTAR_LINE = /^(İhtar|Dikkat|Tenbih|Mühim|Nükte|İkaz|Elhasıl)\s*:/i;

    const isIhtarLine = useCallback((t: string) => {
        return RE_IHTAR_LINE.test(t.trim());
    }, []);

    // 1c. "Ey insan/nefsim" Addressing - Extends to END OF SENTENCE (period)
    // This captures "Ey nefsim, ..." until the next period
    const RE_EY_SENTENCE = /(Ey\s+(?:insan|nefsim|aziz|kardeş|birader|said|arkadaş|müslüman|gafil|nefis)[^.!?]*[.!?])/gi;

    // 2. Semantic Emphasis (Sacred Names & Terms)
    // Expanded List: (Same list as before)
    const SACRED_TERMS = [
        "Allah", "Rabb", "Rab", "İlah", "Mabud", "Hâlık", "Halık", "Sâni", "Sani",
        "Rahmân", "Rahman", "Rahîm", "Rahim", "Kerîm", "Kerim", "Hakîm", "Hakim",
        "Alîm", "Alim", "Kadîr", "Kadir", "Kuddûs", "Kuddus", "Kuddüs",
        "Adl", "Ferd", "Hayy", "Kayyûm", "Kayyum", "Şâfi", "Şafi", "Rezzâk", "Rezzak",
        "Cemîl", "Cemil", "Celîl", "Celil", "Vâhid", "Vahid", "Ehad", "Samed",
        "Bismillah", "Bi's-mi'llah", "Bismillahi",
        "Resul", "Nebi", "Peygamber", "Habib", "Sünnet", "Hadis", "Vahiy",
        "Kur'an", "Kur'ân", "Furkan", "Kelamullah",
        "Bediüzzaman", "Said Nursi", "Risale-i Nur", "Risale-i Nur'u",
        "Vesselam", "Elhamdülillah", "Sübhanallah", "Maşallah", "İnşallah",
        "Barekallah", "Ve aleykümselam", "Aleykümselam"
    ];

    const TERMS_PATTERN = SACRED_TERMS.join("|").replace(/\./g, "\\.");

    // FIX: Capture the whole term + suffix in Group 1 to preserve it during split
    const RE_SACRED = new RegExp(`\\b((?:${TERMS_PATTERN})(?:(?:'|’)[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+)?)\\b`, 'gi');

    const RE_SACRED_CHECK = new RegExp(`^((?:${TERMS_PATTERN})(?:(?:'|’)[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+)?)$`, 'i');

    // 3. Definition (Word: Definition...)
    const RE_DEFINITION = /^([^:]{2,30}):\s+(.+)/;

    // ─────────────────────────────────────────────────────────────
    // GLOBAL CONSTANTS (Hoisted for Performance)
    // ─────────────────────────────────────────────────────────────
    const INDENT = "      ";
    // Regex to capture "ArabicWord" + (Space/Punct + "ArabicWord")*
    const AR_RANGE = "\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF";
    const RE_ARABIC_PHRASE = new RegExp(`([${AR_RANGE}]+(?:[\\s\\.,;!?]+[${AR_RANGE}]+)*)`, "g");

    // ─────────────────────────────────────────────────────────────
    // SUB-RENDERERS
    // ─────────────────────────────────────────────────────────────

    // Wraps "Turkish" text with Sacred Name + "Ey ..." highlighting
    const renderSacredText = useCallback((textChunk: string, keyPrefix: string) => {
        // First pass: Split by "Ey ..." SENTENCE patterns (extends to period)
        const eyParts = textChunk.split(RE_EY_SENTENCE);

        return eyParts.map((chunk, eyIdx) => {
            if (!chunk) return null;

            // Check if this chunk is an "Ey ..." sentence
            if (RE_EY_SENTENCE.test(chunk)) {
                // Reset regex lastIndex since we're using global flag
                RE_EY_SENTENCE.lastIndex = 0;
                return (
                    <Text
                        key={`${keyPrefix}-ey-${eyIdx}`}
                        style={styles.eyAddress}
                        onPress={interactiveEnabled ? (e) => handlePress(chunk, e.nativeEvent.pageY) : undefined}
                    >
                        {chunk}
                    </Text>
                );
            }

            // Second pass: Process Sacred Names within this chunk
            const parts = chunk.split(RE_SACRED);
            return parts.map((part, i) => {
                if (!part) return null;

                // Check uses the Non-Global regex to verify match without side effects
                if (RE_SACRED_CHECK.test(part)) {
                    // Sacred Name -> Bold Black (700)
                    return (
                        <Text
                            key={`${keyPrefix}-sacred-${eyIdx}-${i}`}
                            style={{ fontWeight: '700', color: '#000' }}
                            onPress={interactiveEnabled ? (e) => handlePress(part, e.nativeEvent.pageY) : undefined}
                        >
                            {part}
                        </Text>
                    );
                }
                // Normal text part -> split by words for Lugat if needed
                if (onWordPress) {
                    const words = part.split(/(\s+|[.,;!?]+)/);
                    return words.map((w, wIdx) => {
                        const cleanW = w.trim();
                        if (cleanW.length > 0 && !/^[.,;!?]+$/.test(cleanW)) {
                            // SMART SPAN: Find neighbors
                            let prevWord = undefined;
                            let nextWord = undefined;

                            // Look back
                            for (let k = wIdx - 1; k >= 0; k--) {
                                const p = words[k].trim();
                                if (p.length > 0 && !/^[.,;!?]+$/.test(p)) {
                                    prevWord = p;
                                    break;
                                }
                            }

                            // Look forward
                            for (let k = wIdx + 1; k < words.length; k++) {
                                const n = words[k].trim();
                                if (n.length > 0 && !/^[.,;!?]+$/.test(n)) {
                                    nextWord = n;
                                    break;
                                }
                            }

                            return (
                                <Text
                                    key={`${keyPrefix}-tr-${i}-${wIdx}`}
                                    onPress={interactiveEnabled ? (e) => handlePress(cleanW, e.nativeEvent.pageY, prevWord, nextWord) : undefined}
                                    suppressHighlighting={false}
                                >
                                    {w}
                                </Text>
                            );
                        }
                        return <Text key={`${keyPrefix}-tr-${i}-${wIdx}`}>{w}</Text>;
                    });
                }
                return <Text key={`${keyPrefix}-tr-${eyIdx}-${i}`}>{part}</Text>;
            });
        });
    }, [color, onWordPress, handlePress, interactiveEnabled]);

    // ─────────────────────────────────────────────────────────────
    // SEGMENTED RENDERER (Flow Control)
    // ─────────────────────────────────────────────────────────────

    type RenderSegment = {
        type: 'inline' | 'block';
        node: React.ReactNode;
        key: string;
    };

    /**
     * Parses the paragraph into Inline and Block segments.
     * Returns an array of segments that can be rendered in a View with wrapping.
     */
    const getParagraphSegments = useCallback((paragraph: string, baseKey: string): RenderSegment[] => {
        // Split by Arabic phrases (Capturing group includes the Arabic phrase)
        const parts = paragraph.split(RE_ARABIC_PHRASE);
        const segments: RenderSegment[] = [];

        parts.forEach((part, idx) => {
            if (!part) return;

            const key = `${baseKey}-${idx}`;

            // Check if Arabic (Test the whole part)
            if (RE_ARABIC.test(part)) {
                // Determine if Block vs Inline
                // Remove <ar> tags if present (though phrase regex usually captures plain content)
                const content = part.replace(RE_AR_TAG, "$1");
                const isBlock = shouldArabicBeBlock(content);

                if (isBlock) {
                    // BLOCK: Needs to break flow
                    segments.push({
                        type: 'block',
                        key,
                        node: (
                            <Text key={key} style={[styles.arabicBlock, {
                                fontSize: arabicBlockSize,
                                lineHeight: arabicBlockLineHeight,
                                color: arabicColor,
                                width: '100%',
                            }]}>
                                {content}
                            </Text>
                        )
                    });
                } else {
                    // INLINE
                    segments.push({
                        type: 'inline',
                        key,
                        node: (
                            <Text key={key} style={[styles.arabicInline, {
                                fontSize: arabicInlineSize,
                                lineHeight: arabicInlineSize * 2.2,
                                color: arabicColor,
                            }]}>
                                {content}
                            </Text>
                        )
                    });
                }
            } else {
                // Turkish Text
                const nodes = renderSacredText(part, key) as any[]; // Type cast for array handling
                if (nodes) {
                    // Flatten the nested arrays from renderSacredText (EyParts -> Parts)
                    // We use a simple reduce or flat logic since flat() might strictly depend on environment
                    const flattened: React.ReactNode[] = [];

                    const flattenDeep = (arr: any[]) => {
                        arr.forEach(item => {
                            if (Array.isArray(item)) {
                                flattenDeep(item);
                            } else if (item) {
                                flattened.push(item);
                            }
                        });
                    };

                    if (Array.isArray(nodes)) {
                        flattenDeep(nodes);
                        flattened.forEach((n, ni) => {
                            // n is already a ReactElement with a key from renderSacredText
                            // But simply pushing it leaves the original key, which might collide if logic is flawed.
                            // We FORCE a new unique key based on the flattened index to be 100% safe.
                            const safeNode = React.isValidElement(n)
                                ? React.cloneElement(n, { key: `${key}-safe-${ni}` })
                                : n;
                            segments.push({ type: 'inline', key: `${key}-flat-${ni}`, node: safeNode });
                        });
                    }
                }
            }
        });
        return segments;
    }, [fontSize, arabicColor, arabicBlockSize, arabicInlineSize, renderSacredText]);

    /**
     * Renders a list of segments into a Flow (View containing Text chunks and Block chunks).
     */
    const renderFlow = useCallback((segments: RenderSegment[], wrapperStyle: any, prefix?: React.ReactNode) => {
        const views: React.ReactNode[] = [];
        let inlineBuffer: React.ReactNode[] = [];

        if (prefix) {
            inlineBuffer.push(prefix);
        }

        const flush = (idx: number) => {
            if (inlineBuffer.length > 0) {
                views.push(
                    <Text
                        key={`flow-txt-${idx}`}
                        style={wrapperStyle}
                        {...(isAndroid ? { includeFontPadding: false, textBreakStrategy: "simple", hyphenationFrequency: "none" } : {})}
                    >
                        {inlineBuffer}
                    </Text>
                );
                inlineBuffer = [];
            }
        };

        segments.forEach((seg, i) => {
            if (seg.type === 'block') {
                flush(i);
                // Render block directly in the View (breaking the Text flow)
                views.push(seg.node);
            } else {
                inlineBuffer.push(seg.node);
            }
        });

        flush(segments.length);

        return (
            <View style={{ width: '100%' }}>
                {views}
            </View>
        );
    }, [isAndroid]);


    return (
        <View style={styles.container}>
            {parsed.map((p, pIndex) => {
                const flat = p.trim();
                if (!flat) return null;

                // ────────────────────────────────────────────────────────
                // SHARED STYLE PROPS
                // ────────────────────────────────────────────────────────
                const bodyStyle = [styles.body, { fontSize, lineHeight: bodyLineHeight, textAlign: alignBody, color }];

                // 1. Divider
                if (flat === "***" || flat === "* * *") {
                    return (
                        <View key={`dv-${pIndex}`} style={styles.dividerWrap}>
                            <View style={styles.dividerLine} />
                        </View>
                    );
                }

                // 2. Full Arabic Block
                if (isArabicLine(flat)) {
                    return (
                        <Text key={`ab-${pIndex}`} style={[styles.arabicBlock, {
                            fontSize: arabicBlockSize,
                            lineHeight: arabicBlockLineHeight,
                            color: arabicColor
                        }]}>
                            {flat.replace(RE_AR_TAG, "$1")}
                        </Text>
                    );
                }

                // 3. Sual / İhtar Lines (Refactored for Block Support)
                if (isSualLine(flat) || isIhtarLine(flat)) {
                    const colonIdx = flat.indexOf(':');
                    const labelTxt = flat.substring(0, colonIdx + 1);
                    const restTxt = flat.substring(colonIdx + 1).trim();
                    const isSual = isSualLine(flat);

                    const labelNode = (
                        <Text key={`lbl-${pIndex}`} style={[styles.semanticLabel, { fontSize: labelSize }]}>
                            {labelTxt}{' '}
                        </Text>
                    );

                    // Parse the rest content
                    const segments = getParagraphSegments(restTxt, `p-${pIndex}`);

                    // Content Style
                    const contentStyle = [
                        bodyStyle,
                        styles.semanticContent // Apply Italic/Bold to the wrapper
                    ];

                    return (
                        <View key={`sem-${pIndex}`} style={{ marginBottom: 12 }}>
                            {renderFlow(segments, contentStyle, labelNode)}
                        </View>
                    );
                }

                // 4. Question Content (after standalone Sual)
                const prevP = pIndex > 0 ? parsed[pIndex - 1].trim() : '';
                if (isAfterSual && flat.includes('?')) {
                    const segments = getParagraphSegments(flat, `pq-${pIndex}`);
                    const qStyle = [bodyStyle, styles.semanticContent];
                    return (
                        <View key={`sq-${pIndex}`} style={{ marginBottom: 12 }}>
                            {renderFlow(segments, qStyle)}
                        </View>
                    );
                }

                // 5. Headings
                if (isHeadingLine(flat)) {
                    return (
                        <Text key={`hd-${pIndex}`} style={[styles.heading, {
                            fontSize: headingSize,
                            lineHeight: headingLineHeight,
                            color
                        }]}>
                            {flat}
                        </Text>
                    );
                }

                // 6. Definition
                const defMatch = flat.match(RE_DEFINITION);
                if (defMatch) {
                    const label = defMatch[1] + ":";
                    const rest = defMatch[2];
                    const labelNode = <Text key={`df-lbl-${pIndex}`} style={{ fontWeight: '700', color: '#000' }}>{label} </Text>;
                    const segments = getParagraphSegments(rest, `df-${pIndex}`);
                    return (
                        <View key={`def-${pIndex}`} style={{ marginBottom: 12 }}>
                            {renderFlow(segments, bodyStyle, labelNode)}
                        </View>
                    );
                }

                // 7. Standard Paragraph
                // Handle implicit phrase segmentation
                const segments = getParagraphSegments(flat, `p-${pIndex}`);
                // Add INDENT to first inline segment
                const indentNode = <Text key={`indent-${pIndex}`}>{INDENT}</Text>;

                return (
                    <View key={`para-${pIndex}`} style={{ marginBottom: 12 }}>
                        {renderFlow(segments, bodyStyle, indentNode)}
                    </View>
                );

            })}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },

    body: {
        fontFamily: "serif", // Native serif for book-like readability
        marginBottom: 12,
    },

    sualLabel: {
        fontWeight: "700",
        color: "#000",
        letterSpacing: 0.6,
        // FontSize handled dynamically
    },

    heading: {
        textAlign: "center",
        marginTop: 24, // Increased spacing
        marginBottom: 16,
        fontFamily: "LivaNur",
        fontWeight: "700", // Bolder
        letterSpacing: 0.5,
        color: "#000",
    },

    arabicParaWrap: {
        marginVertical: 10,
    },

    arabicBlock: {
        textAlign: "center",
        // fontFamily: "KFGQPC_HAFS", // OLD
        fontFamily: "ScheherazadeNew", // NEW: Scheherazade New
        // fontWeight: "400", // Scheherazade usually supports 700 too if needed
        writingDirection: "rtl",
        // FIX: Enable font padding on Android to prevent clipping
        includeFontPadding: Platform.OS === 'android',
        letterSpacing: 0, // NEVER negative
        marginVertical: 4, // Reduced from 10 to tighten spacing between stacked blocks
        // FIX: Add padding to block to ensure no clipping, but reduced from 12
        paddingTop: 6,
        paddingBottom: 6,
    },

    arabicInline: {
        // fontFamily: "KFGQPC_HAFS", // OLD
        fontFamily: "ScheherazadeNew", // NEW: Scheherazade New
        // fontWeight: "400",
        writingDirection: "rtl",
        // FIX: Enable font padding on Android to prevent clipping of high diacritics (hareke)
        includeFontPadding: Platform.OS === 'android',
        letterSpacing: 0, // NEVER negative
        // FIX: Explicit line height to accommodate tall glyphs
        // lineHeight: 50, // Arbitrary large value will be ignored if nested, but useful if separate. 
        // Better strategy: We can't easily validly set lineHeight on nested text in all RN versions.
        // Instead, we rely on padding or reduced size if clipping occurs.
        // Let's try removing includeFontPadding: false constraint first.
        // lineHeight: 60, // Arbitrary large value
        paddingTop: 10, // Increased buffer
        paddingBottom: 4, // Added bottom buffer
        textAlignVertical: 'center', // Help centering
    },

    dividerWrap: {
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 20,
        paddingHorizontal: 40,
    },

    dividerLine: {
        width: "60%",
        height: 1,
        backgroundColor: "#999",
        opacity: 0.4,
    },

    // Premium V20: Semantic Styling
    semanticLabel: {
        fontWeight: 'bold', // Strong emphasis
        color: '#000',      // Black
        marginLeft: 0,
        // fontSize handled dynamically (1.2x)
    },
    semanticContent: {
        fontWeight: '700',  // Bold Italic
        fontStyle: 'italic',
        color: '#000',      // Pure Black for high contrast
        letterSpacing: 0.1, // Slight breathing room
    },
    eyAddress: {
        fontWeight: '700',
        fontStyle: 'italic',
        color: '#5D4037',  // Warm brown matching labels
    },
});
