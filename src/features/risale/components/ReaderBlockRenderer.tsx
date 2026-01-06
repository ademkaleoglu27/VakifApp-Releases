import React, { useMemo } from 'react';
import { Text, View, StyleSheet, TextStyle, Platform, ViewStyle } from 'react-native';

export type BlockType = 'heading' | 'note' | 'arabic_block' | 'label' | 'paragraph';

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

export interface ReaderBlockRendererProps {
    block: Block;
    presets: RenderPresets;
    baseFontSize: number;
}

// Internal Font Map - Golden Standard
const FONTS = {
    heading: 'PirataOne',
    body: 'Tinos',
    bodyBold: 'TinosBold',
    bodyItalic: 'TinosItalic',
    arabic: 'Amiri',
};

function computeTextStyle(baseFontSize: number, preset: PresetStyle, fontFamily: string, type: BlockType): TextStyle {
    const fontSize = baseFontSize + (preset.fontSizeDelta || 0);

    // STRICT: Golden Standard Line Height Multiplier Lock
    // If paragraph, force 1.62 multiplier if not explicitly set to something else in preset (which should be 1.62 anyway)
    // But user asked to "lock" it. 
    let multiplier = preset.lineHeightMultiplier;
    if (type === 'paragraph') multiplier = 1.62;

    // Safer to just use preset if we trust it, but user said "paragraph lineHeightMultiplier 1.62" as criteria.
    // I will enforce it here to be safe.

    const lineHeight = fontSize * (multiplier || 1.5);

    const s: TextStyle = {
        fontFamily,
        fontSize,
        lineHeight,
        fontWeight: preset.fontWeight,
        textAlign: preset.textAlign,
        writingDirection: preset.writingDirection,
        // Critical: Explicitly undefined to prevent wrapping/inheritance issues
        letterSpacing: undefined,
        opacity: preset.opacity ?? 1,
    };

    // Golden Standard: Arabic specific overrides
    if (type === 'arabic_block') {
        s.textAlign = 'center';
        s.writingDirection = 'rtl';
        s.color = '#B3261E'; // Mandatory Red
    }

    // Golden Standard: Note opacity
    if (type === 'note') {
        s.opacity = 0.85;
    }

    // Golden Standard: Label spacing handled in View usually, but ensure text style is clean

    // Android Typography Fixes
    if (Platform.OS === 'android') {
        s.includeFontPadding = false;
        s.textBreakStrategy = 'highQuality';
    }

    return s;
}

const HeadingBlock = React.memo(({ text, preset, baseFontSize }: { text: string; preset: PresetStyle; baseFontSize: number }) => {
    const style = useMemo(() => computeTextStyle(baseFontSize, preset, FONTS.heading, 'heading'), [baseFontSize, preset]);
    return (
        <View style={{ marginTop: preset.marginTop, marginBottom: preset.marginBottom }}>
            <Text style={style} selectable={false}>{text}</Text>
        </View>
    );
});

const NoteBlock = React.memo(({ text, preset, baseFontSize }: { text: string; preset: PresetStyle; baseFontSize: number }) => {
    const font = FONTS.bodyItalic;
    const style = useMemo(() => computeTextStyle(baseFontSize, preset, font, 'note'), [baseFontSize, preset]);
    return (
        <View style={{ marginTop: preset.marginTop, marginBottom: preset.marginBottom }}>
            <Text style={style} selectable={false}>{text}</Text>
        </View>
    );
});

const ArabicBlock = React.memo(({ text, preset, baseFontSize }: { text: string; preset: PresetStyle; baseFontSize: number }) => {
    const style = useMemo(() => computeTextStyle(baseFontSize, preset, FONTS.arabic, 'arabic_block'), [baseFontSize, preset]);
    return (
        <View style={{ marginTop: preset.marginTop, marginBottom: preset.marginBottom }}>
            <Text style={style} selectable={false}>{text}</Text>
        </View>
    );
});

const LabelBlock = React.memo(({ text, preset, baseFontSize }: { text: string; preset: PresetStyle; baseFontSize: number }) => {
    const style = useMemo(() => computeTextStyle(baseFontSize, preset, FONTS.bodyBold, 'label'), [baseFontSize, preset]);
    // Golden Standard: marginBottom 4
    return (
        <View style={{ marginTop: preset.marginTop, marginBottom: 4 }}>
            <Text style={style} selectable={false}>{text}</Text>
        </View>
    );
});

const ParagraphBlock = React.memo(({ text, preset, baseFontSize }: { text: string; preset: PresetStyle; baseFontSize: number }) => {
    const style = useMemo(() => computeTextStyle(baseFontSize, preset, FONTS.body, 'paragraph'), [baseFontSize, preset]);

    if (Platform.OS === 'android' && Platform.Version < 26) {
        style.textAlign = 'left';
    }

    return (
        <View style={{ marginTop: preset.marginTop, marginBottom: preset.marginBottom }}>
            <Text style={style} selectable={false}>{text}</Text>
        </View>
    );
});

const DividerBlock = React.memo(({ preset }: { preset: PresetStyle }) => {
    const containerStyle: ViewStyle = useMemo(
        () => ({
            marginTop: preset.marginTop,
            marginBottom: preset.marginBottom,
            opacity: preset.opacity ?? 0.5,
            alignItems: 'center',
            justifyContent: 'center',
        }),
        [preset]
    );

    return (
        <View style={containerStyle}>
            <View style={styles.dividerLine} />
        </View>
    );
});

export const ReaderBlockRenderer = React.memo(({ block, presets, baseFontSize }: ReaderBlockRendererProps) => {
    const cleanText = (block.text ?? '').trim();
    if (!cleanText) return null;

    // Divider check
    const isDividerText = block.type === 'paragraph' && cleanText === '***';
    if (isDividerText) {
        const dividerPreset = presets.divider || {
            fontSizeDelta: 0,
            fontWeight: '400',
            textAlign: 'center',
            writingDirection: 'ltr',
            lineHeightMultiplier: 1,
            marginTop: 16,
            marginBottom: 16,
            opacity: 0.5
        };
        return <DividerBlock preset={dividerPreset} />;
    }

    switch (block.type) {
        case 'heading':
            return <HeadingBlock text={cleanText} preset={presets.heading || presets.paragraph} baseFontSize={baseFontSize} />;
        case 'note':
            return <NoteBlock text={cleanText} preset={presets.note || presets.paragraph} baseFontSize={baseFontSize} />;
        case 'arabic_block':
            return <ArabicBlock text={cleanText} preset={presets.arabic_block || presets.paragraph} baseFontSize={baseFontSize} />;
        case 'label':
            return <LabelBlock text={cleanText} preset={presets.label || presets.paragraph} baseFontSize={baseFontSize} />;
        case 'paragraph':
            return <ParagraphBlock text={cleanText} preset={presets.paragraph} baseFontSize={baseFontSize} />;
        default:
            return <ParagraphBlock text={cleanText} preset={presets.paragraph} baseFontSize={baseFontSize} />;
    }
});

const styles = StyleSheet.create({
    dividerLine: {
        height: StyleSheet.hairlineWidth * 2,
        width: 120,
        backgroundColor: '#000',
        borderRadius: 1,
    },
});
