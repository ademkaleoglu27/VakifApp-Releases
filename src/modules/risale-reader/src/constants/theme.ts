import { Platform } from 'react-native';

export const ReaderTheme = {
    colors: {
        background: '#F4ECD8', // Saman sarısı / Old Paper
        text: '#000000',      // Black
        verseBg: '#F4ECD8',   // Match new background
        arabic: '#B91C1C',    // Deep Red
        footnote: '#8B0000',  // Dark Red for footnotes
        heading: '#000000',   // Black
        separator: '#A3A3A3', // Visible separator color
    },
    typography: {
        // "LivaNur sadece büyük başlıklarda"
        // "Gövde metin: tema fontu (okunaklı serif)"
        // "Araçpa için: Amiri Regular"
        headingFont: Platform.select({ ios: 'System', android: 'serif' }), // Placeholder for LivaNur
        bodyFont: Platform.select({ ios: 'System', android: 'serif' }),
        arabicFont: 'Amiri', // Use the loaded Google Font

        sizes: {
            heading: 25,
            body: 17.5,
            arabicHero: 29, // "Konu başı (hero) ayet: 29px"
            arabicBlock: 26, // "Konu içi blok ayet: 26px"
            arabicInline: 27, // "Inline ayet: ~27px eşdeğeri"
            footnote: 14,
        },
        lineHeights: {
            body: 26.25,      // 1.50
            arabicHero: 56.55, // 1.95
            arabicBlock: 45.5,// 1.75
        },
        letterSpacing: {
            body: -0.175, // -0.01em
        },
        wordSpacing: {
            arabicHero: 1.74, // 29 * 0.06 (Ferah)
            arabicBlock: -1.56, // 26 * -0.06 (Sıkı - User request)
            arabicInline: -1.62, // 27 * -0.06 (Çok Sıkı)
        }
    },
    spacing: {
        pagePadding: 15,
        paragraphMargin: 10,
        headingTop: 14,
        headingBottom: 8,
    }
};
