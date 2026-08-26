const fs = require('fs');
const path = require('path');

// MOCK INPUT (Simulating a file from alitekdemir/Risale-i-Nur-Diyanet/obsidian-markdown)
const mockMarkdown = `
# Birinci Söz

بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحٖيمِ

وَ بِهٖ نَسْتَعٖينُ

اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمٖينَ وَ الصَّلَاةُ وَ السَّلَامُ عَلٰى سَيِّدِنَا مُحَمَّدٍ وَ عَلٰى اٰلِهٖ وَ صَحْبِهٖ اَجْمَعٖينَ

Ey kardeş! Benden birkaç nasihat istedin. Sen bir asker olduğun için askerlik temsilatıyla, sekiz hikâyecikler ile birkaç hakikati nefsimle beraber dinle. Çünkü ben nefsimi herkesten ziyade nasihate muhtaç görüyorum.

## Birinci Söz

**Bismillah** her hayrın başıdır. Biz dahi başta ona başlarız. Bil ey nefsim, şu mübarek kelime İslâm nişanı olduğu gibi bütün mevcudatın lisan-ı haliyle vird-i zebanıdır.

**Bismillah** ne büyük tükenmez bir kuvvet, ne çok bitmez bir bereket olduğunu anlamak istersen şu temsilî hikâyeciğe bak, dinle. Şöyle ki:
`;

// Helper: Arabic Detection
function isArabic(text) {
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
    const arabicChars = (text.match(arabicRegex) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 && (arabicChars / totalChars) > 0.6;
}

// CONVERTER LOGIC
function convertMdToHtml(md) {
    const lines = md.split('\n');
    let htmlLines = [];

    lines.forEach(line => {
        const text = line.trim();
        if (!text) return;

        if (text.startsWith('# ')) {
            htmlLines.push(`<h1>${text.substring(2)}</h1>`);
        } else if (text.startsWith('## ')) {
            htmlLines.push(`<h2>${text.substring(3)}</h2>`);
        } else if (isArabic(text)) {
            htmlLines.push(`<div class="arabic-block" dir="rtl">${text}</div>`);
        } else {
            // Basic bold markdown parsing
            const content = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            htmlLines.push(`<p>${content}</p>`);
        }
    });

    return `
<div class="entry-content">
${htmlLines.join('\n')}
</div>
    `;
}

// GENERATE
const bodyContent = convertMdToHtml(mockMarkdown);
console.log("--- GENERATED HTML ---");
console.log(bodyContent);
console.log("----------------------");
console.log("Report: This script demonstrates how we can use the Obsidian/Markdown source to generate clean, verified HTML automatically, adding our 'arabic-block' classes without runtime JS.");
