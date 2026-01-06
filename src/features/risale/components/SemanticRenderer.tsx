import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextStyle, ViewStyle, Platform } from 'react-native';

// --- Type Definitions ---
export type BlockType = 'heading' | 'note' | 'arabic_block' | 'label' | 'paragraph' | 'divider';

export interface Block {
    type: BlockType;
    text: string;
}

export interface PresetStyle {
    fontSizeDelta: number;
    fontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    textAlign: 'left' | 'center' | 'right' | 'justify';
    writingDirection: 'auto' | 'ltr' | 'rtl';
    lineHeightMultiplier: number;
    marginTop: number;
    marginBottom: number;
    opacity?: number | null;
}

export interface RenderPresets {
    heading: PresetStyle;
    note: PresetStyle;
    arabic_block: PresetStyle;
    label: PresetStyle;
    paragraph: PresetStyle;
    divider: PresetStyle;
}

interface SemanticRendererProps {
    blocks: Block[];
    presets: RenderPresets;
    baseFontSize?: number;
    containerStyle?: ViewStyle;
}

// --- Font Placeholders (To be configured by User) ---
// Not: Bu isimler projenizdeki font yapılandırmasına tam uymalıdır.
const FONTS = {
    heading: 'PirataOne',  // Örn: Custom Heading Font
    body: 'Tinos',         // Örn: Custom Body Font
    bodyItalic: 'TinosItalic',
    bodyBold: 'TinosBold',
    arabic: 'Amiri',       // Örn: Custom Arabic Font
};

// --- Helper: Apply Preset to Base Style ---
const applyPresetStyle = (baseSize: number, preset: PresetStyle, isArabic: boolean = false): TextStyle => {
    const fontSize = baseSize + (preset.fontSizeDelta || 0);

    // Line height hesaplaması
    // Arabic için biraz daha geniş tutulabilir, ancak preset multiplier bunu zaten yönetmeli.
    const lineHeight = fontSize * (preset.lineHeightMultiplier || 1.5);

    const style: TextStyle = {
        fontSize,
        lineHeight,
        fontWeight: preset.fontWeight,
        textAlign: preset.textAlign,
        writingDirection: preset.writingDirection,
        marginTop: preset.marginTop,
        marginBottom: preset.marginBottom,
        opacity: preset.opacity ?? 1,
    };

    // Font Family Mapping
    if (isArabic) {
        style.fontFamily = FONTS.arabic;
    } else if (preset.fontWeight === 'bold') { // Basit bir mapping, daha karmaşık olabilir
        style.fontFamily = FONTS.bodyBold;
    } else if (preset.opacity && preset.opacity < 1) { // Note gibi durumlar için heuristic
        style.fontFamily = FONTS.bodyItalic;
    } else {
        style.fontFamily = FONTS.body;
    }

    // Heading Override
    // Bu kısım preset "type" bilgisi olmadığı için dışarıdan font family inject edilerek de çözülebilir
    // Ancak şimdilik type-based font assignment BlockRenderer içinde yapılacak.

    // Android "justify" fallback (gerekirse)
    if (Platform.OS === 'android' && preset.textAlign === 'justify') {
        // Android'de justify bazen kelime aralarını çok açabilir. 
        // İstenirse burada 'left' fallback yapılabilir.
        // style.textAlign = 'left'; 
    }

    return style;
};

// --- Components ---

const HeadingBlock = React.memo(({ text, preset, baseSize }: { text: string, preset: PresetStyle, baseSize: number }) => {
    const style = useMemo(() => {
        const s = applyPresetStyle(baseSize, preset);
        s.fontFamily = FONTS.heading; // Explicit font for heading
        return s;
    }, [baseSize, preset]);

    return <Text style={style}>{text}</Text>;
});

const NoteBlock = React.memo(({ text, preset, baseSize }: { text: string, preset: PresetStyle, baseSize: number }) => {
    const style = useMemo(() => {
        const s = applyPresetStyle(baseSize, preset);
        s.fontFamily = FONTS.bodyItalic; // Explicit italic
        return s;
    }, [baseSize, preset]);

    return <Text style={style}>{text}</Text>;
});

const ArabicBlock = React.memo(({ text, preset, baseSize }: { text: string, preset: PresetStyle, baseSize: number }) => {
    const style = useMemo(() => {
        const s = applyPresetStyle(baseSize, preset, true);
        // Force RTL specific View/Text props if needed
        return s;
    }, [baseSize, preset]);

    return <Text style={style}>{text}</Text>;
});

const LabelBlock = React.memo(({ text, preset, baseSize }: { text: string, preset: PresetStyle, baseSize: number }) => {
    const style = useMemo(() => {
        const s = applyPresetStyle(baseSize, preset);
        s.fontFamily = FONTS.bodyBold;
        return s;
    }, [baseSize, preset]);

    return <Text style={style}>{text}</Text>;
});

const ParagraphBlock = React.memo(({ text, preset, baseSize }: { text: string, preset: PresetStyle, baseSize: number }) => {
    const style = useMemo(() => applyPresetStyle(baseSize, preset), [baseSize, preset]);
    return <Text style={style}>{text}</Text>;
});

const DividerBlock = React.memo(({ preset }: { preset: PresetStyle }) => {
    return (
        <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: preset.marginTop,
            marginBottom: preset.marginBottom,
            opacity: preset.opacity ?? 0.5,
        }}>
            <View style={{
                height: 1,
                backgroundColor: '#000', // Tema rengine çekilmeli
                width: 40, // Kısa çizgi
            }} />
        </View>
    );
});

// --- Main Renderer ---

const BlockRenderer = React.memo(({ block, presets, baseFontSize }: { block: Block, presets: RenderPresets, baseFontSize: number }) => {
    const { type, text } = block;

    // Skip empty text (unless it implies a spacer? Strict rule: empty text -> skip)
    // Divider exception handled below
    const cleanText = text ? text.trim() : '';

    // RULE: Paragraph with "***" -> Divider
    if (type === 'paragraph' && cleanText === '***') {
        return <DividerBlock preset={presets.divider} />;
    }

    if (!cleanText && type !== 'divider') {
        return null;
    }

    switch (type) {
        case 'heading':
            return <HeadingBlock text={cleanText} preset={presets.heading} baseSize={baseFontSize} />;
        case 'note':
            return <NoteBlock text={cleanText} preset={presets.note} baseSize={baseFontSize} />;
        case 'arabic_block':
            return <ArabicBlock text={cleanText} preset={presets.arabic_block} baseSize={baseFontSize} />;
        case 'label':
            return <LabelBlock text={cleanText} preset={presets.label} baseSize={baseFontSize} />;
        case 'paragraph':
            return <ParagraphBlock text={cleanText} preset={presets.paragraph} baseSize={baseFontSize} />;
        default:
            return null;
    }
});

export const SemanticRenderer: React.FC<SemanticRendererProps> = ({
    blocks,
    presets,
    baseFontSize = 18,
    containerStyle
}) => {

    const renderItem = useCallback(({ item }: { item: Block }) => {
        return <BlockRenderer block={item} presets={presets} baseFontSize={baseFontSize} />;
    }, [presets, baseFontSize]);

    const keyExtractor = useCallback((item: Block, index: number) => {
        return `${item.type}-${index}`;
    }, []);

    return (
        <FlatList
            data={blocks}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={[styles.container, containerStyle]}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            // Performance props
            removeClippedSubviews={Platform.OS === 'android'}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#FFF9E6', // Default cream theme
    }
});
