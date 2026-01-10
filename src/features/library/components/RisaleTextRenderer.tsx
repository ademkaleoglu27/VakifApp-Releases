import React, { memo, useCallback, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

/**
 * RisaleTextRenderer (Golden Standard V7 - LOCKED)
 * ─────────────────────────────────────────────────────────────
 * FINALIZED TYPOGRAPHY & LAYOUT RULES:
 * 1. Android: textAlign 'left' | iOS: 'justify'
 * 2. Paragraphs: Indented (6 spaces)
 * 3. Arabic: 
 *    - Font: KFGQPC_HAFS (Clean/Thin)
 *    - Implicit Phrase Segmentation: Runs of Arabic words are DETECTED and ISOLATED as Blocks.
 *    - <ar> tags are STRIPPED globally to prevent artifacts.
 * 4. Semantics:
 *    - Sacred Names (Allah, Esma-ül Hüsna): Bold (700) + Black (#000)
 *    - Sual/Elcevap Labels: Bold (700) + Black (#000)
 * 5. Lugat: Inline Mini Card (Model A)
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
};

const RNK_ARABIC = "#B3261E";

const RE_ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const RE_ARABIC_RUN = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/g;

// <ar>...</ar> tag support
const RE_AR_TAG = /<ar>([\s\S]*?)<\/ar>/gi;

const HEADER_KEYWORDS = [
    "Birinci", "İkinci", "Üçüncü", "Dördüncü", "Beşinci",
    "Altıncı", "Yedinci", "Sekizinci", "Dokuzuncu", "Onuncu",
    "Söz", "Mektup", "Lem'a", "Lem’a", "Şua", "İhtar",
    "Tenbih", "Mukaddime", "Hâtime", "Hatıra", "Temsil", "Nükte",
    "BİRİNCİ", "İKİNCİ", "ÜÇÜNCÜ", "DÖRDÜNCÜ", "BEŞİNCİ"
];

export function isHeadingLine(t: string): boolean {
    const s = t.trim();
    if (!s) return false;
    if (s.length > 70) return false;
    return HEADER_KEYWORDS.some((k) => s.includes(k));
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
    // Remove <ar> tags globally (V7 logic detects content by char range), keep content.
    return raw.replace(/<\/?ar>/gi, "").replace(/\r/g, "").replace(/\t/g, " ").trim();
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
    } = props;

    const isAndroid = Platform.OS === "android";
    const alignBody = isAndroid ? "left" : "justify";

    // Scaled metrics (Golden Standard)
    const bodyLineHeight = Math.round(fontSize * 1.7);

    // KFGQPC is thinner/smaller, so we increase size slightly
    const arabicInlineSize = Math.round(fontSize * 1.28);
    const arabicBlockSize = Math.max(24, Math.round(fontSize * 1.55));
    const arabicBlockLineHeight = Math.round(arabicBlockSize * 1.8);

    const headingSize = Math.round(fontSize * 1.35);
    const headingLineHeight = Math.round(headingSize * 1.4);

    const parsed = useMemo(() => {
        if (!text) return [];
        // Raw split by newline first
        return text.split("\n").map(normalizeLine).filter(Boolean);
    }, [text]);

    // Word press handler - Now captures coordinates and context (Smart Span)
    const handlePress = useCallback((w: string, pageY: number, prev?: string, next?: string) => {
        if (!onWordPress) return;
        // Normalize: remove punctuation
        const clean = w.replace(/[.,;:!?(){}[\]"']/g, "").toLowerCase();

        // Context cleaning (basic)
        const cleanPrev = prev ? prev.replace(/[.,;:!?(){}[\]"']/g, "").toLowerCase() : undefined;
        const cleanNext = next ? next.replace(/[.,;:!?(){}[\]"']/g, "").toLowerCase() : undefined;

        // Pass coordinates and context up
        onWordPress(clean, pageY, cleanPrev, cleanNext);
    }, [onWordPress]);

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
    const RE_IHTAR_LINE = /^(İhtar|Dikkat|Tenbih|Mühim|Nükte|İkaz)\s*:/i;

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
        "Bediüzzaman", "Said Nursi", "Risale-i Nur", "Risale-i Nur'u"
    ];

    const TERMS_PATTERN = SACRED_TERMS.join("|").replace(/\./g, "\\.");

    const RE_SACRED = new RegExp(`\\b(${TERMS_PATTERN})(?:(?:'|’)[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+)?\\b`, 'gi');

    const RE_SACRED_CHECK = new RegExp(`^(${TERMS_PATTERN})(?:(?:'|’)[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+)?$`, 'i');

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
                        onPress={(e) => handlePress(chunk, e.nativeEvent.pageY)}
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
                            onPress={(e) => handlePress(part, e.nativeEvent.pageY)}
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
                            // Filter out empty spaces/punct to find real words? 
                            // The split keeps delimiters. So words[wIdx-1] might be space.
                            // We need to look back/forward skipping spaces.

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
                                    onPress={(e) => handlePress(cleanW, e.nativeEvent.pageY, prevWord, nextWord)}
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
    }, [color, onWordPress, handlePress]);

    /**
     * Renders a Mixed paragraph (Turkish + Inline Arabic + Mini Blocks).
     * Now supports Semantic Emphasis (Sacred Names) inside Turkish parts.
     */
    const renderInlineWithArabic = useCallback((paragraph: string, extraStyles?: any) => {
        // We split by Arabic runs
        const parts = paragraph.split(RE_ARABIC_RUN);
        const children: React.ReactNode[] = [];

        parts.forEach((part, idx) => {
            if (!part) return;

            // Check if Arabic
            if (RE_ARABIC.test(part)) {
                // Determine if Block vs Inline
                const content = part.replace(RE_AR_TAG, "$1");
                const isBlock = shouldArabicBeBlock(content);

                if (isBlock) {
                    // Mini Block (Inline but forced newlines/size)
                    children.push(
                        <Text key={`ar-${idx}`} style={{
                            fontSize: arabicBlockSize,
                            color: arabicColor,
                            fontFamily: "KFGQPC_HAFS",
                            writingDirection: "rtl",
                        }}>
                            {`\n${content}\n`}
                        </Text>
                    );
                } else {
                    // True inline
                    children.push(
                        <Text key={`ar-${idx}`} style={[styles.arabicInline, {
                            fontSize: arabicInlineSize,
                            color: arabicColor,
                        }]}>
                            {content}
                        </Text>
                    );
                }
            } else {
                // Turkish Text -> Processing Chain: 
                // 1. Semantic (Sacred Names)
                // 2. Interactive (Lugat) -> handled in renderSacredText
                children.push(renderSacredText(part, `seg-${idx}`));
            }
        });
        return children;
    }, [fontSize, arabicColor, arabicBlockSize, arabicInlineSize, renderSacredText]);


    return (
        <View style={styles.container}>
            {parsed.map((p, pIndex) => {
                const flat = p.trim(); // single line usually
                if (!flat) return null;

                // PREMIUM V20: If this chunk follows standalone "Sual:", apply question styling
                if (isAfterSual && flat.includes('?')) {
                    return (
                        <Text
                            key={`sq-${pIndex}`}
                            style={[styles.body, styles.semanticContent, { fontSize, lineHeight: bodyLineHeight, textAlign: alignBody }]}
                            {...(isAndroid ? { includeFontPadding: false, textBreakStrategy: "simple", hyphenationFrequency: "none" } : {})}
                        >
                            {renderInlineWithArabic(flat)}
                        </Text>
                    );
                }

                // 1. Divider
                if (flat === "***" || flat === "* * *") {
                    return (
                        <View key={`dv-${pIndex}`} style={styles.dividerWrap}>
                            <View style={styles.dividerLine} />
                        </View>
                    );
                }

                // 2. Full Arabic Block (Priority 1)
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

                // 3. Sual / Elcevap Block (Premium V20: Italic Content)
                if (isSualLine(flat)) {
                    const colonIdx = flat.indexOf(':');
                    const label = flat.substring(0, colonIdx + 1);
                    const rest = flat.substring(colonIdx + 1).trim();

                    // STANDALONE SUAL: Look ahead for next paragraph and style as question
                    if (!rest && pIndex < parsed.length - 1) {
                        // Find next non-empty paragraph
                        let nextContent = '';
                        for (let ni = pIndex + 1; ni < parsed.length; ni++) {
                            const nextP = parsed[ni].trim();
                            if (nextP && !isSualLine(nextP) && !isIhtarLine(nextP) && !isHeadingLine(nextP)) {
                                // Check if this is the question content (ends with ?)
                                if (nextP.includes('?')) {
                                    nextContent = nextP;
                                }
                                break;
                            }
                        }
                        // Just render label alone for now, content will be styled when we reach it
                        return (
                            <Text
                                key={`se-${pIndex}`}
                                style={[styles.body, { fontSize, lineHeight: bodyLineHeight, textAlign: alignBody }]}
                                {...(isAndroid ? { includeFontPadding: false, textBreakStrategy: "simple", hyphenationFrequency: "none" } : {})}
                            >
                                <Text style={styles.semanticLabel}>{label}</Text>
                            </Text>
                        );
                    }

                    return (
                        <Text
                            key={`se-${pIndex}`}
                            style={[styles.body, { fontSize, lineHeight: bodyLineHeight, textAlign: alignBody, color }]}
                            {...(isAndroid ? { includeFontPadding: false, textBreakStrategy: "simple", hyphenationFrequency: "none" } : {})}
                        >
                            <Text style={styles.semanticLabel}>{label} </Text>
                            <Text style={styles.semanticContent}>{renderInlineWithArabic(rest)}</Text>
                        </Text>
                    );
                }

                // 3a. Question Content (follows standalone Sual:)
                // Check if previous paragraph was standalone "Sual:"
                const prevP = pIndex > 0 ? parsed[pIndex - 1].trim() : '';
                if (isStandaloneSualChunk(prevP) && flat.includes('?')) {
                    // This is the question content - style it elegantly until ?
                    return (
                        <Text
                            key={`sq-${pIndex}`}
                            style={[styles.body, styles.semanticContent, { fontSize, lineHeight: bodyLineHeight, textAlign: alignBody }]}
                            {...(isAndroid ? { includeFontPadding: false, textBreakStrategy: "simple", hyphenationFrequency: "none" } : {})}
                        >
                            {renderInlineWithArabic(flat)}
                        </Text>
                    );
                }

                // 3b. İhtar / Dikkat Block (Premium V20: Italic Content)
                if (isIhtarLine(flat)) {
                    const colonIdx = flat.indexOf(':');
                    const label = flat.substring(0, colonIdx + 1);
                    const rest = flat.substring(colonIdx + 1).trim();

                    return (
                        <Text
                            key={`ih-${pIndex}`}
                            style={[styles.body, { fontSize, lineHeight: bodyLineHeight, textAlign: alignBody, color }]}
                            {...(isAndroid ? { includeFontPadding: false, textBreakStrategy: "simple", hyphenationFrequency: "none" } : {})}
                        >
                            <Text style={styles.semanticLabel}>{label} </Text>
                            <Text style={styles.semanticContent}>{renderInlineWithArabic(rest)}</Text>
                        </Text>
                    );
                }

                // 4. Headings
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

                // 5. Definition Style
                const defMatch = flat.match(RE_DEFINITION);
                // Ensure it's not a long sentence (limit label length filter handled by regex {2,30})
                if (defMatch) {
                    const label = defMatch[1] + ":";
                    const rest = defMatch[2];

                    return (
                        <Text
                            key={`df-${pIndex}`}
                            style={[styles.body, { fontSize, lineHeight: bodyLineHeight, textAlign: alignBody, color }]}
                            {...(isAndroid ? { includeFontPadding: false, textBreakStrategy: "simple", hyphenationFrequency: "none" } : {})}
                        >
                            <Text style={{ fontWeight: '700', color: '#000' }}>{label} </Text>
                            {renderInlineWithArabic(rest)}
                        </Text>
                    );
                }

                // 6. Standard Paragraph (Turkish + Inline or Mixed with Blocks)
                // New Logic: Implicit Phrase Segmentation using Hoisted Regex
                // Split by Runs of Arabic Words (grouping words separated by space/punct).
                // This treats "Word Word" as a single Arabic Token.

                // Helper to render a segment list
                const renderParagraphSegments = () => {
                    // Split by Implicit Phrase
                    const segments = flat.split(RE_ARABIC_PHRASE);
                    const renderedNodes: React.ReactNode[] = [];

                    // Buffer for inline segments
                    let inlineBuffer: React.ReactNode[] = [];
                    let isFirstSegment = true;

                    // Function to flush inline buffer
                    const flushBuffer = (keyIdx: number) => {
                        if (inlineBuffer.length === 0) return;

                        const prefix = (isFirstSegment) ? INDENT : null;
                        isFirstSegment = false;

                        renderedNodes.push(
                            <Text
                                key={`p-seg-${pIndex}-${keyIdx}`}
                                style={[
                                    styles.body,
                                    {
                                        color,
                                        fontSize,
                                        lineHeight: bodyLineHeight,
                                        textAlign: alignBody,
                                    },
                                ]}
                                {...(isAndroid ? { includeFontPadding: false, textBreakStrategy: "simple", hyphenationFrequency: "none" } : {})}
                            >
                                {prefix}
                                {inlineBuffer}
                            </Text>
                        );
                        inlineBuffer = [];
                    };

                    segments.forEach((seg, sIdx) => {
                        if (!seg) return;

                        // Check if this segment is an Arabic Phrase
                        // We can check if it starts with Arabic char
                        if (RE_ARABIC.test(seg)) {
                            // It's Arabic Content (Phrase)
                            if (shouldArabicBeBlock(seg)) {
                                // BLOCK
                                flushBuffer(sIdx - 1);

                                // Render Block
                                renderedNodes.push(
                                    <Text key={`ab-seg-${pIndex}-${sIdx}`} style={[styles.arabicBlock, {
                                        fontSize: arabicBlockSize,
                                        lineHeight: arabicBlockLineHeight,
                                        color: arabicColor,
                                        width: '100%',
                                    }]}>
                                        {seg}
                                    </Text>
                                );
                                isFirstSegment = false;
                            } else {
                                // INLINE Arabic (Short, Single word)
                                inlineBuffer.push(
                                    <Text key={`ar-in-${pIndex}-${sIdx}`} style={[styles.arabicInline, {
                                        fontSize: arabicInlineSize,
                                        color: arabicColor,
                                    }]}>
                                        {seg}
                                    </Text>
                                );
                            }
                        } else {
                            // Turkish Text
                            // Process for Semantic Emphasis & Interactive Lugat
                            const nodes = renderSacredText(seg, `p-tr-${pIndex}-${sIdx}`);
                            if (Array.isArray(nodes)) {
                                nodes.forEach(n => inlineBuffer.push(n));
                            } else if (nodes) {
                                inlineBuffer.push(nodes);
                            }
                        }
                    });

                    // Flush remaining
                    flushBuffer(segments.length);

                    return renderedNodes;
                };

                return (
                    <React.Fragment key={`frag-${pIndex}`}>
                        {renderParagraphSegments()}
                    </React.Fragment>
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
        marginTop: 18,
        marginBottom: 12,
        fontFamily: "LivaNur",
        fontWeight: "600",
        letterSpacing: 0.5,
    },

    arabicParaWrap: {
        marginVertical: 10,
    },

    arabicBlock: {
        textAlign: "center",
        fontFamily: "KFGQPC_HAFS", // Specific Uthmanic font
        writingDirection: "rtl",
        includeFontPadding: false,
        letterSpacing: 0, // NEVER negative
        marginVertical: 10,
    },

    arabicInline: {
        fontFamily: "KFGQPC_HAFS", // Specific Uthmanic font
        writingDirection: "rtl",
        includeFontPadding: false,
        letterSpacing: 0, // NEVER negative
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
        fontWeight: '800',  // Extra Bold for visibility
        color: '#000',      // Black for maximum contrast
    },
    semanticContent: {
        fontWeight: '600',  // Semi-bold
        fontStyle: 'italic',
        color: '#333',
    },
    eyAddress: {
        fontWeight: '700',
        fontStyle: 'italic',
        color: '#5D4037',  // Warm brown matching labels
    },
});
