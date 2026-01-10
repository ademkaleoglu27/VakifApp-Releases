import { Platform } from 'react-native';

export const ReaderTheme = {
    colors: {
        background: '#F4ECD8', // Saman sarısı / Old Paper
        text: '#000000',      // Black
        verseBg: '#F4ECD8',   // Match new background
        arabic: '#B3261E',    // RNK Kırmızısı (Gold Standard)
        footnote: '#8B0000',  // Dark Red for footnotes
        heading: '#000000',   // Black
        separator: '#A3A3A3', // Visible separator color
    },
    typography: {
        // Gold Standard Fonts
        headingFont: 'LivaNur', // Gotik/Old Style header font
        bodyFont: 'CrimsonPro', // Serif body font
        arabicFont: 'Amiri', // Classic Naskh (400 Regular, no bold)

        sizes: {
            heading: 25,
            body: 18, // Slightly larger for readability
            arabicHero: 29, // Konu başı ayet (29px per spec)
            arabicBlock: 26, // Blok ayet (26px per spec)
            arabicInline: 22, // Fallback px value
            footnote: 14,
        },
        // Multipliers for dynamic sizing relative to body fontSize
        sizeMultipliers: {
            arabicInline: 1.12, // 1.12em relative to paragraph
        },
        lineHeights: {
            // Gold Standard multipliers
            body: 28.8,      // 18 * 1.6
            heading: 32,
            arabicHero: 50,  // Will use multiplier 1.95
            arabicBlock: 42, // Will use multiplier 1.75
        },
        // Line height multipliers for dynamic calculation
        lineHeightMultipliers: {
            arabicHero: 1.95,
            arabicBlock: 1.75,
            arabicInline: 1.05,
        },
        letterSpacing: {
            body: 0, // Normal for Serif
            heading: 0.5, // Slightly open for Gothic
            arabic: 0, // NEVER negative for Arabic
        },
        wordSpacing: {
            arabicHero: 0.05, // +0.05em ferah
            arabicBlock: -0.06, // -0.06em sıkı
            arabicInline: -0.06, // -0.06em çok sıkı
        }
    },
    spacing: {
        pagePadding: 20, // More "book-like" padding
        paragraphMargin: 12,
        headingTop: 24,
        headingBottom: 16,
    }
};
