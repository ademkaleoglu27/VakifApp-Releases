// --- GOLDEN REFERENCE IMPLEMENTATION ---
// This script implements the locked standard for HTML generation,
// global pagination, and manifest creation as defined in:
// HTML_READER_STANDARD.md
// DO NOT MODIFY LOGIC WITHOUT UPDATING THE STANDARD DOCUMENTATION FIRST.

const https = require('https');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const BOOKS = [
    {
        id: "risale.sozler@diyanet.tr",
        folderName: "01_sozler",
        remoteFolder: "01%20Sözler",
        title: "Sözler",
        files: [
            "01 Birinci Söz.md", "02 İkinci Söz.md", "03 Üçüncü Söz.md", "04 Dördüncü Söz.md", "05 Beşinci Söz.md",
            "06 Altıncı Söz.md", "07 Yedinci Söz.md", "08 Sekizinci Söz.md", "09 Dokuzuncu Söz.md", "10 Onuncu Söz.md",
            "11 On Birinci Söz.md", "12 On İkinci Söz.md", "13 On Üçüncü Söz.md", "14 On Dördüncü Söz.md", "15 On Beşinci Söz.md",
            "16 On Altıncı Söz.md", "17 On Yedinci Söz.md", "18 On Sekizinci Söz.md", "19 On Dokuzuncu Söz.md", "20 Yirminci Söz.md",
            "21 Yirmi Birinci Söz.md", "22 Yirmi İkinci Söz.md", "23 Yirmi Üçüncü Söz.md", "24 Yirmi Dördüncü Söz.md", "25 Yirmi Beşinci Söz.md",
            "26 Yirmi Altıncı Söz.md", "27 Yirmi Yedinci Söz.md", "28 Yirmi Sekizinci Söz.md", "29 Yirmi Dokuzuncu Söz.md", "30 Otuzuncu Söz.md",
            "31 Otuz Birinci Söz.md", "32 Otuz İkinci Söz.md", "33 Otuz Üçüncü Söz.md",
            "34 Lemaat (Sözler).md", "35 Konferans (Sözler).md", "36 Fihrist (Sözler).md"
        ]
    },
    {
        id: "risale.mektubat@diyanet.tr",
        folderName: "02_mektubat",
        remoteFolder: "02%20Mektubat",
        title: "Mektubat",
        files: [
            "01 Birinci Mektup.md", "02 İkinci Mektup.md", "03 Üçüncü Mektup.md", "04 Dördüncü Mektup.md", "05 Beşinci Mektup.md",
            "06 Altıncı Mektup.md", "07 Yedinci Mektup.md", "08 Sekizinci Mektup.md", "09 Dokuzuncu Mektup.md", "10 Onuncu Mektup.md",
            "11 On Birinci Mektup.md", "12 On İkinci Mektup.md", "13 On Üçüncü Mektup.md", "14 On Dördüncü Mektup.md", "15 On Beşinci Mektup.md",
            "16 On Altıncı Mektup.md", "17 On Yedinci Mektup.md", "18 On Sekizinci Mektup.md", "19 On Dokuzuncu Mektup.md", "20 Yirminci Mektup.md",
            "21 Yirmi Birinci Mektup.md", "22 Yirmi İkinci Mektup.md", "23 Yirmi Üçüncü Mektup.md", "24 Yirmi Dördüncü Mektup.md", "25 Yirmi Beşinci Mektup.md",
            "26 Yirmi Altıncı Mektup.md", "27 Yirmi Yedinci Mektup.md", "28 Yirmi Sekizinci Mektup.md", "29 Yirmi Dokuzuncu Mektup.md", "30 Otuzuncu Mektup.md",
            "31 Otuz Birinci Mektup.md", "32 Otuz İkinci Mektup.md", "33 Otuz Üçüncü Mektup.md"
        ]
    },
    {
        id: "risale.lemalar@diyanet.tr",
        folderName: "03_lemalar",
        remoteFolder: "03 Lem'alar",
        title: "Lemalar",
        files: [
            "01 Birinci Lem’a.md", "02 İkinci Lem’a.md", "03 Üçüncü Lem’a.md", "04 Dördüncü Lem’a.md", "05 Beşinci Lem’a.md",
            "06 Altıncı Lem’a.md", "07 Yedinci Lem’a.md", "08 Sekizinci Lem’a.md", "09 Dokuzuncu Lem’a.md", "10 Onuncu Lem’a.md",
            "11 On Birinci Lem’a.md", "12 On İkinci Lem’a.md", "13 On Üçüncü Lem’a.md", "14 On Dördüncü Lem’a.md", "15 On Beşinci Lem’a.md",
            "16 On Altıncı Lem’a.md", "17 On Yedinci Lem’a.md", "18 On Sekizinci Lem’a.md", "19 On Dokuzuncu Lem’a.md", "20 Yirminci Lem’a.md",
            "21 Yirmi Birinci Lem’a.md", "22 Yirmi İkinci Lem’a.md", "23 Yirmi Üçüncü Lem’a.md", "24 Yirmi Dördüncü Lem’a.md", "25 Yirmi Beşinci Lem’a.md",
            "26 Yirmi Altıncı Lem’a.md", "27 Yirmi Yedinci Lem’a.md", "28 Yirmi Sekizinci Lem’a.md", "29 Yirmi Dokuzuncu Lem’a.md", "30 Otuzuncu Lem’a.md",
            "31 Otuz Birinci Lem’a.md", "32 Otuz İkinci Lem’a.md", "33 Otuz Üçüncü Lem’a.md"
        ]
    },
    {
        id: "risale.sualar@diyanet.tr",
        folderName: "04_sualar",
        remoteFolder: "04 Şuâlar",
        title: "Şualar",
        files: [
            "01 Birinci Şuâ.md", "02 İkinci Şuâ.md", "03 Üçüncü Şuâ.md",
            "04 Dördüncü Şuâ.md", "05 Beşinci Şuâ.md", "06 Altıncı Şuâ.md",
            "07 Yedinci Şuâ.md", "08 Sekizinci Şuâ.md", "09 Dokuzuncu Şuâ.md",
            "10 On Birinci Şuâ.md", "11 On İkinci Şuâ.md", "12 On Üçüncü Şuâ.md",
            "13 On Dördüncü Şuâ.md", "14 On Beşinci Şuâ.md",
            "15 Yirmi Dokuzuncu Lem’a’dan İkinci Bab.md",
            "16 Eddâî.md", "17 Dua (Şuâlar).md"
        ]
    },
    {
        id: "risale.tarihce@diyanet.tr",
        folderName: "05_tarihce",
        remoteFolder: "05 Tarihçe-i Hayat",
        title: "Tarihçe-i Hayat",
        files: [
            "00 TARİHÇE-İ HAYAT.md", "01 Ön söz.md", "02 İlk Hayatı.md", "03 Barla Hayatı.md",
            "04 Eskişehir Hayatı.md", "05 Kastamonu Hayatı.md", "06 Denizli Hayatı.md",
            "07 Emirdağ Hayatı.md", "08 Afyon Hayatı.md", "09 Isparta Hayatı.md",
            "10 Hariç Memleketler.md", "11 Bedîüzzaman ve Risale-i Nur.md", "12 Dua (Tarihçe-i Hayatı).md"
        ]
    },
    {
        id: "risale.mesnevi@diyanet.tr",
        folderName: "06_mesnevi",
        remoteFolder: "06 Mesnevî-i Nuriye",
        title: "Mesnevî-i Nuriye",
        files: [
            "00 MESNEVÎ-İ NURİYE.md", "01 İ’tizar.md", "02 Mukaddime.md", "03 Lem’alar Risalesi.md",
            "04 Reşhalar.md", "05 Lâsiyyemalar.md", "06 Katre.md", "07 Hubab.md",
            "08 Habbe.md", "09 Zühre.md", "10 Zerre.md", "11 Şemme Risalesi.md",
            "12 Onuncu Risale.md", "13 Şule.md", "14 Nokta.md", "15 Münderecat Hakkında.md",
            "16 Fihrist (Mesnevî).md"
        ]
    },
    {
        id: "risale.isarat@diyanet.tr",
        folderName: "07_isarat",
        remoteFolder: "07 İşaratü'l-i'caz",
        title: "İşaratü'l-i'caz",
        files: [
            "00 İŞARATÜ’L-İ’CAZ.md", "01 Tenbih.md", "02 İfadetü’l-Meram.md", "03 Kur’an’ın Tarifi.md",
            "04 Fatiha Suresi.md", "05 Bakara Suresi 1- 2- 3. âyetler.md", "06 Bakara Suresi 4-5. âyetler.md",
            "07 Bakara Suresi 6. âyet.md", "08 Bakara Suresi 7. âyet.md", "09 Bakara Suresi 8. âyet.md",
            "10 Bakara Suresi 9-10. âyetler.md", "11 Bakara Suresi 11-12. âyetler.md", "12 Bakara Suresi 13. âyet.md",
            "13 Bakara Suresi 14-15. âyetler.md", "14 Bakara Suresi 16. âyet.md", "15 Bakara Suresi 17-18-19-20. âyetler.md",
            "16 Bakara Suresi 21-22. âyetler.md", "17 Bakara Suresi 23-24. âyetler.md", "18 Bakara Suresi 25. âyet.md",
            "19 Bakara Suresi 26-27. âyetler.md", "20 Bakara Suresi 28. âyet.md", "21 Bakara Suresi 29. âyet.md",
            "22 Bakara Suresi 30. âyet.md", "23 Bakara Suresi 31-32-33. âyetler.md",
            "24 Ecnebi Feylesofların Kur’an Hakkındaki Beyanatları.md", "25 Mehmed Kayalar’ın Bir Müdafaası.md",
            "26 Dua (İşaratü’l-İ’caz).md", "27 Fihrist (İşaratü’l-İ’caz).md"
        ]
    },
    {
        id: "risale.sikke@diyanet.tr",
        folderName: "08_sikke",
        remoteFolder: "08 Sikke-i Tasdik-i Gaybî",
        title: "Sikke-i Tasdik-i Gaybî",
        files: [
            "00 SİKKE-İ TASDİK-İ GAYBÎ.md", "01 Parlak Fıkralar ve Güzel Mektuplar 1.md",
            "02 Birinci Şuâ.md", "03 Sekizinci Şuâ.md", "04 On Sekizinci Lem’a.md",
            "05 Yirmi Sekizinci Lem’a.md", "06 Sekizinci Lem’a.md", "07 Parlak Fıkralar ve Güzel Mektuplar 2.md",
            "08 Dua (Sikke-i Tasdik-i Gaybî).md"
        ]
    },
    {
        id: "risale.barla@diyanet.tr",
        folderName: "09_barla",
        remoteFolder: "09 Barla Lâhikası",
        title: "Barla Lâhikası",
        files: [
            "00 BARLA LÂHİKASI.md", "01 Barla Lâhikası - Takdim.md", "02 Barla Lâhikası - Yedinci Risale.md",
            "03 Barla Lâhikası s.21-39.md", "04 Barla Lâhikası s.40-58.md", "05 Barla Lâhikası s.59-80.md",
            "06 Barla Lâhikası s.80-102.md", "07 Barla Lâhikası s.103-121.md", "08 Barla Lâhikası s.121-146.md",
            "09 Barla Lâhikası s.146-159.md", "10 Barla Lâhikası s.160-180.md", "11 Barla Lâhikası s.181-201.md",
            "12 Barla Lâhikası s.202-221.md", "13 Barla Lâhikası s.221-240.md", "14 Barla Lâhikası s.241-261.md",
            "15 Barla Lâhikası s.262-280.md", "16 Barla Lâhikası s.280-299.md", "17 Barla Lâhikası s.300-321.md",
            "18 Barla Lâhikası s.321-340.md", "19 Barla Lâhikası s.340-362.md", "20 Barla Lâhikası s.363-392.md"
        ]
    },
    {
        id: "risale.kastamonu@diyanet.tr",
        folderName: "10_kastamonu",
        remoteFolder: "10 Kastamonu Lâhikası",
        title: "Kastamonu Lâhikası",
        files: [
            "00 KASTAMONU LÂHİKASI.md", "01 Kastamonu Lâhikası - Takdim.md", "02 Kastamonu Lâhikası s.10-30.md",
            "03 Kastamonu Lâhikası s.30-51.md", "04 Kastamonu Lâhikası s.52-69.md", "05 Kastamonu Lâhikası s.70-91.md",
            "06 Kastamonu Lâhikası s.91-109.md", "07 Kastamonu Lâhikası s.110-129.md", "08 Kastamonu Lâhikası s.130-149.md",
            "09 Kastamonu Lâhikası s.150-166 (Lemaat’tan).md", "10 Kastamonu Lâhikası s.167-189.md",
            "11 Kastamonu Lâhikası s.190-210.md", "12 Kastamonu Lâhikası s.211-230.md", "13 Kastamonu Lâhikası s.231-255.md"
        ]
    },
    {
        id: "risale.emirdag1@diyanet.tr",
        folderName: "11_emirdag1",
        remoteFolder: "11 Emirdağ Lâhikası 1",
        title: "Emirdağ Lâhikası 1",
        files: [
            "00 EMİRDAĞ LÂHİKASI - I.md", "01 Emirdağ Lâhikası - I - Takdim.md", "02 Emirdağ Lâhikası - I s.10-31.md",
            "03 Emirdağ Lâhikası - I s.31-50.md", "04 Emirdağ Lâhikası - I s.50-69.md", "05 Emirdağ Lâhikası - I s.70-90.md",
            "06 Emirdağ Lâhikası - I s.90-110.md", "07 Emirdağ Lâhikası - I s.110-130.md", "08 Emirdağ Lâhikası - I s.131-150.md",
            "09 Emirdağ Lâhikası - I s.150-170.md", "10 Emirdağ Lâhikası - I s.170-190.md", "11 Emirdağ Lâhikası - I s.190-211.md",
            "12 Emirdağ Lâhikası - I s.212-230.md", "13 Emirdağ Lâhikası - I s.230-251.md", "14 Emirdağ Lâhikası - I s.251-270.md",
            "15 Emirdağ Lâhikası - I s.271-288.md"
        ]
    },
    {
        id: "risale.emirdag2@diyanet.tr",
        folderName: "12_emirdag2",
        remoteFolder: "12 Emirdağ Lâhikası 2",
        title: "Emirdağ Lâhikası 2",
        files: [
            "00 EMİRDAĞ LÂHİKASI - II.md", "01 Emirdağ Lâhikası - II s.6-26.md", "02 Emirdağ Lâhikası - II s.27-50.md",
            "03 Emirdağ Lâhikası - II s.51-70.md", "04 Emirdağ Lâhikası - II s.70-90.md", "05 Emirdağ Lâhikası - II s.91-109.md",
            "06 Emirdağ Lâhikası - II s.110-128.md", "07 Emirdağ Lâhikası - II s.129-148.md", "08 Emirdağ Lâhikası - II s.149-170.md",
            "09 Emirdağ Lâhikası - II s.171-189.md", "10 Emirdağ Lâhikası - II s.190-210.md", "11 Emirdağ Lâhikası - II s.210-229.md",
            "12 Emirdağ Lâhikası - II s.230-247.md"
        ]
    },
    {
        id: "risale.asayi@diyanet.tr",
        folderName: "13_asayi",
        remoteFolder: "13 Asâ-yı Musa",
        title: "Asâ-yı Musa",
        files: [
            "000 ASÂ-YI MUSA.md", "100 Asâ-yı Musa’dan Birinci Kısım.md", "101 Birinci Mesele.md", "102 İkinci Mesele.md",
            "103 Üçüncü Mesele.md", "104 Dördüncü Mesele.md", "105 Beşinci Mesele.md", "106 Altıncı Mesele.md",
            "107 Yedinci Mesele.md", "108 Sekizinci Mesele.md", "109 Dokuzuncu Mesele.md", "110 Onuncu Mesele.md",
            "111 On Birinci Mesele.md", "200 Asâ-yı Musa’dan İkinci Kısım.md", "201 Birinci Hüccet-i İmaniye.md",
            "202 İkinci Hüccet-i İmaniye.md", "203 Üçüncü Hüccet-i İmaniye.md", "204 Dördüncü Hüccet-i İmaniye.md",
            "205 Beşinci Hüccet-i İmaniye.md", "206 Altıncı Hüccet-i İmaniye.md", "207 Yedinci Hüccet-i İmaniye.md",
            "208 Sekizinci Hüccet-i İmaniye.md", "209 Dokuzuncu Hüccet-i İmaniye.md", "210 Onuncu Hüccet-i İmaniye.md",
            "211 On Birinci Hüccet-i İmaniye.md", "212 Fihrist (Asâ-yı Musa).md"
        ]
    },
    {
        id: "risale.muhakemat@diyanet.tr",
        folderName: "14_muhakemat",
        remoteFolder: "14 Muhakemat",
        title: "Muhakemat",
        files: [
            "00 MUHAKEMAT.md", "00 Mukaddeme.md", "01 Birinci Makale.md", "02 İkinci Makale.md",
            "03 Üçüncü Makale.md", "04 Fihrist (Muhakemat).md", "05 Takriz.md"
        ]
    }
];

const BASE_URL_ROOT = "https://raw.githubusercontent.com/alitekdemir/Risale-i-Nur-Diyanet/master/obsidian-markdown/";

// --- FONT LOADING ---
function getFontBase64() {
    try {
        const fontPath = path.join(__dirname, '../src/features/reader/html_pilot/ScheherazadeNewBase64.ts');
        if (fs.existsSync(fontPath)) {
            const content = fs.readFileSync(fontPath, 'utf8');
            const match = content.match(/export const SCHEHERAZADE_BASE64 = "(.*?)";/s);
            if (match && match[1]) {
                return match[1];
            }
        }
    } catch (e) {
        console.warn("[WARN] Could not load font base64:", e.message);
    }
    return null;
}

// --- CSS TEMPLATE (CANONICAL) ---
const CANONICAL_CSS = (fontBase64) => `
<style>
  ${fontBase64 ? `
  @font-face {
    font-family: 'ScheherazadeNew';
    src: url(data:font/ttf;charset=utf-8;base64,${fontBase64}) format('truetype');
    font-weight: normal;
    font-style: normal;
  }` : ''}

  :root { 
      --bg: #efe7d1; 
      --text: #111; 
      --arabic: #b3261e; 
      --base-size: 19px;
  }
  
  html, body { 
    margin: 0; 
    padding: 0; 
    background: var(--bg); 
    color: var(--text); 
    min-height: 100vh;
    box-sizing: border-box; 
  }
  
  body {
    font-family: "Crimson Pro", "Times New Roman", serif;
    font-size: var(--base-size);
    line-height: 1.62;
    padding: 24px 20px 100px; /* Excessive bottom padding for scroll/action bar */
    -webkit-text-size-adjust: 100%;
    
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
  }

  ::selection {
    background: rgba(189, 148, 90, 0.3);
    color: inherit;
  }

  /* ARABIC BLOCKS */
  .arabic-block { 
    font-family: "ScheherazadeNew", "Noto Naskh Arabic", serif; 
    color: var(--arabic); 
    text-align: center !important; 
    font-size: clamp(24px, 1.5rem, 32px); 
    line-height: 1.9; 
    padding: 12px 0; 
    margin: 16px 0;
    display: block; 
    direction: rtl;
    width: 100%;
  }

  /* INLINE ARABIC SPANS */
  span.arabic, .arabic {
      font-family: "ScheherazadeNew", "Noto Naskh Arabic", serif;
      color: var(--arabic);
      font-size: 1.25em; 
      line-height: 1.4;
      white-space: normal !important;
      overflow-wrap: break-word !important;
  }
  
  /* HEADINGS */
  h1, h2, h3, .heading-1, .heading-2, .heading-3 { 
    font-family: "UnifrakturCook", "Germania One", serif; 
    text-align: center; 
    margin: 32px 0 16px; 
    line-height: 1.3; 
    color: #000;
    font-weight: bold;
    white-space: normal;
    overflow-wrap: break-word;
  }

  h1, .heading-1 { font-size: clamp(22px, 1.3rem, 28px); }
  h2, .heading-2 { font-size: clamp(20px, 1.2rem, 24px); }
  h3, .heading-3 { font-size: clamp(19px, 1.1rem, 21px); }
  
  /* PARAGRAPHS & BODY TEXT */
  .paragraph, p, .entry-content, #content, body {
    text-align: start !important;
    word-spacing: normal !important;
    letter-spacing: normal !important;
    white-space: normal;
  }

  /* PAGE MARKER (Sticky Visual pagination) */
  .page-marker-wrap {
      position: -webkit-sticky;
      position: sticky;
      top: 10px;
      z-index: 100;
      display: flex;
      justify-content: flex-end;
      pointer-events: none;
      margin-top: -20px; /* Pull up to overlap slightly or sit tight */
      margin-bottom: 0;
  }
  
  .page-marker {
      opacity: 0.9;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 4px 8px;
      border-radius: 10px;
      background: rgba(0,0,0,0.06);
      color: rgba(0,0,0,0.75);
      font-family: sans-serif;
      backdrop-filter: blur(2px);
  }

  .paragraph, p {
    margin: 0 0 14px; 
    overflow-wrap: break-word;
    -webkit-hyphens: auto;
    hyphens: auto;
  }
  
  /* QUOTES */
  blockquote, .quote {
      margin: 16px 24px;
      font-style: italic;
      color: #444;
      border-left: 3px solid #ccc;
      padding-left: 12px;
  }

  /* PRE TAGS */
  pre {
      white-space: pre-wrap !important;
      overflow-wrap: break-word !important;
      font-family: inherit !important;
      font-size: inherit !important;
      background: none !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
      color: inherit !important;
  }

  /* DIVIDER */
  hr.divider {
      border: 0;
      height: 1px;
      background: #ccc;
      margin: 40px auto;
      width: 60%;
  }

  /* FOOTNOTE MARKERS */
  .fn-marker {
    color: #1F6FEB; /* Blue Star */
    font-weight: bold;
    cursor: pointer;
    background: none;
    border: none;
    font-size: 0.9em;
    vertical-align: super;
    padding: 0 4px;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* LABELS (Semantic) */
  .label-text {
      font-weight: 700;
  }
</style>
`;

// --- JS TEMPLATE (CANONICAL) ---
const CANONICAL_JS = `
<script>
(function() {
    let scrollTimer;
    let selectionTimeout;

    function send(type, payload={}) {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
        }
    }

    document.addEventListener("DOMContentLoaded", function() {
        send("READER_READY", { 
            title: document.title,
            hasHandlers: true
        });
        reportMetrics();
    });

    function reportMetrics() {
        const scrollTop = window.scrollY;
        const viewportHeight = window.innerHeight;
        const contentHeight = document.body.scrollHeight;
        
        let currentPage = 1;
        let totalPages = 1;
        
        if (viewportHeight > 0) {
            currentPage = Math.floor(scrollTop / viewportHeight) + 1;
            totalPages = Math.ceil(contentHeight / viewportHeight);
        }

        send("METRICS", { 
            scrollTop, viewportHeight, contentHeight, currentPage, totalPages 
        });
    }

    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(reportMetrics, 100);
    });
    window.addEventListener('resize', reportMetrics);

    function reportSelection() {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : "";
        if (!text) return;
        
        let rect = { x: 0, y: 0, width: 0, height: 0 };
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const clientRect = range.getBoundingClientRect();
            rect = {
                x: clientRect.x,
                y: clientRect.y,
                width: clientRect.width,
                height: clientRect.height,
                top: clientRect.top,
                bottom: clientRect.bottom,
                left: clientRect.left,
                right: clientRect.right
            };
        }
        
        send("SELECTION", { text, rect });
    }

    document.addEventListener('selectionchange', function() {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(reportSelection, 300); 
    });

    document.addEventListener('click', function(e) {
        const closestMarker = e.target.closest('.fn-marker');
        if (closestMarker) {
            e.preventDefault();
            e.stopPropagation();
            const fnId = closestMarker.getAttribute('data-fn-id');
            const contentDiv = document.querySelector('#footnotes [data-fn-id="' + fnId + '"]');
            if (contentDiv) {
                send("FOOTNOTE_CONTENT", { text: contentDiv.innerHTML });
            } else {
                send("CONSOLE", { msg: "Footnote content not found for " + fnId });
            }
        }
    });

})();
</script>
`;

// --- HELPER: DETECT ARABIC ---
function isArabicBlock(text) {
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
    const matches = text.match(arabicRegex);
    if (!matches) return false;
    const arabicCount = matches.length;
    const totalCount = text.replace(/\s/g, '').length;
    return (arabicCount / totalCount) > 0.5;
}

// --- CONVERTER FUNCTION ---
function normalizeAndConvert(markdown, index, fontBase64, startPage = 1) {
    let htmlLines = [];
    let content = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');

    let footnotes = {};
    const lines = content.split('\n');
    let blocks = [];
    let currentBuffer = [];

    let charAccumulator = 0;
    const PAGE_THRESHOLD = 1500;
    let localPageCount = 1;

    blocks.push({ type: 'page_marker', num: startPage });

    function flushBuffer() {
        if (currentBuffer.length === 0) return;

        let fullText = currentBuffer.join(' ').trim();
        fullText = fullText.replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ');

        if (fullText) {
            const len = fullText.length;
            charAccumulator += len;

            if (charAccumulator >= PAGE_THRESHOLD) {
                localPageCount++;
                const newPageNum = startPage + localPageCount - 1;
                blocks.push({ type: 'page_marker', num: newPageNum });
                charAccumulator = 0;
            }

            if (isArabicBlock(fullText)) {
                blocks.push({ type: 'arabic', text: fullText });
            } else {
                blocks.push({ type: 'p', text: fullText });
            }
        }
        currentBuffer = [];
    }

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
            flushBuffer();
            continue;
        }

        let hMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (hMatch) {
            flushBuffer();
            const level = hMatch[1].length;
            const text = hMatch[2];
            let finalLevel = level;
            if (level > 3) finalLevel = 3;
            blocks.push({ type: 'h' + finalLevel, text: text });
            continue;
        }

        let fnDefMatch = line.match(/^\[\^{1,2}(.*?)\]:\s*(.*)/);
        if (fnDefMatch) {
            flushBuffer();
            const id = fnDefMatch[1];
            const val = fnDefMatch[2];
            footnotes[id] = val;
            continue;
        }

        if (line.startsWith('>')) {
            flushBuffer();
            blocks.push({ type: 'quote', text: line.replace(/^>\s*/, '') });
            continue;
        }

        if (/^(\*{3,}|-{3,})$/.test(line)) {
            flushBuffer();
            blocks.push({ type: 'hr' });
            continue;
        }
        currentBuffer.push(line);
    }
    flushBuffer();

    htmlLines.push(`<!DOCTYPE html>`);
    htmlLines.push(`<html lang="tr">`);
    htmlLines.push(`<head>`);
    htmlLines.push(`<meta charset="utf-8">`);
    htmlLines.push(`<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />`);
    htmlLines.push(CANONICAL_CSS(fontBase64));
    htmlLines.push(CANONICAL_JS);
    htmlLines.push(`</head>`);
    htmlLines.push(`<body>`);

    if (index === 1) {
        htmlLines.push(`<h1 class="heading-1">${blocks.find(b => b.type.startsWith('h'))?.text || "Bölüm"}</h1>`);
    }

    blocks.forEach(blk => {
        let txt = blk.text || "";
        txt = txt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        txt = txt.replace(/\*(.*?)\*/g, '<em>$1</em>');
        txt = txt.replace(/\[\^{1,2}(.*?)\]/g, (match, id) => {
            if (!footnotes[id]) {
                console.warn(`[WARN] Missing footnote def for [^${id}] in File ${index}`);
            }
            return `<button class="fn-marker" data-fn-id="${id}">★</button>`;
        });

        const LABELS = ["İhtar:", "Sual:", "Elhasıl:", "Netice:", "Ezcümle:", "Tenbih:"];
        LABELS.forEach(lbl => {
            if (txt.includes(lbl)) {
                txt = txt.replace(lbl, `<span class="label-text">${lbl}</span>`);
            }
        });

        if (blk.type === 'h1') htmlLines.push(`<h1>${txt}</h1>`);
        else if (blk.type === 'h2') htmlLines.push(`<h2>${txt}</h2>`);
        else if (blk.type === 'h3') htmlLines.push(`<h3>${txt}</h3>`);
        else if (blk.type === 'hr') htmlLines.push(`<hr class="divider" />`);
        else if (blk.type === 'quote') htmlLines.push(`<blockquote>${txt}</blockquote>`);
        else if (blk.type === 'arabic') htmlLines.push(`<div class="arabic-block" dir="rtl">${txt}</div>`);
        else if (blk.type === 'page_marker') htmlLines.push(`<div class="page-marker-wrap"><span class="page-marker" data-page="${blk.num}">${blk.num}</span></div>`);
        else htmlLines.push(`<p class="paragraph">${txt}</p>`);
    });

    htmlLines.push(`<div id="footnotes" style="display:none;">`);
    for (const [id, content] of Object.entries(footnotes)) {
        htmlLines.push(`<div data-fn-id="${id}">${content}</div>`);
    }
    htmlLines.push(`</div>`);
    htmlLines.push(`</body>`);
    htmlLines.push(`</html>`);

    return {
        html: htmlLines.join('\n'),
        pageCount: (localPageCount > 0 ? localPageCount : 1),
        blocks: blocks
    };
}

// --- MAIN EXECUTION ---
async function run() {
    console.log("Starting Content Pipeline (Canonical Wrapper)...");
    const fontBase64 = getFontBase64();
    let allManifests = [];

    for (const book of BOOKS) {
        console.log(`\n📚 Processing Book: ${book.title} (${book.id})`);

        const outputDir = path.join(__dirname, '../android/app/src/main/assets/risale_html_pilot', book.folderName);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let globalPageOffset = 0;
        let manifestSections = [];
        let allBookBlocks = [];

        for (let i = 0; i < book.files.length; i++) {
            const file = book.files[i];
            const index = i + 1;

            const encodedFolder = book.remoteFolder;
            const encodedName = encodeURIComponent(file).replace(/'/g, '%27');
            const url = `${BASE_URL_ROOT}${encodedFolder}/${encodedName}`;

            console.log(`  [${index}] Downloading: ${file}`);

            try {
                const rawData = await download(url);
                if (rawData) {
                    const currentStartPage = globalPageOffset + 1;
                    const { html, pageCount, blocks } = normalizeAndConvert(rawData, index, fontBase64, currentStartPage);

                    const fileIndexStr = String(index).padStart(2, '0');
                    const destName = `${book.folderName.split('_')[0]}_${fileIndexStr}.html`; // 01_01.html or 02_01.html

                    const destPath = path.join(outputDir, destName);
                    fs.writeFileSync(destPath, html, 'utf8');

                    // Collect blocks for JSON DB
                    // Add section markers if needed? The blocks already have 'type'.
                    // We might need to inject a 'section' block at the start if it wasn't there?
                    // The 'normalizeAndConvert' doesn't explicitly add a 'section' type block for the file itself.
                    // But 'ingest-lemalar.js' expects: "if (block.type === 'section')".
                    // Does 'blocks' contain 'section'?
                    // Looking at 'normalizeAndConvert' logic:
                    // It pushes 'h1', 'p', 'arabic', etc.
                    // It does NOT push 'section'.
                    // So we must wrap or inject a section block here.

                    allBookBlocks.push({
                        type: 'section',
                        title: blocks.find(b => b.type.startsWith('h'))?.text || file.replace('.md', ''),
                        order_index: index
                    });

                    allBookBlocks.push(...blocks);

                    const sectionId = `${book.id}:html_${fileIndexStr}`;

                    manifestSections.push({
                        sectionId: sectionId,
                        index: index,
                        file: destName,
                        title: `${String(index - 1).padStart(2, '0')} ${file.replace('.md', '')}`,
                        startPage: currentStartPage,
                        pageCount: pageCount
                    });

                    globalPageOffset += pageCount;
                }
            } catch (e) {
                console.error(`    [ERR] Failed ${file}: ${e.message}`);
            }
            await new Promise(r => setTimeout(r, 20));
        }

        const manifestPath = path.join(outputDir, 'manifest.json');
        const manifestData = {
            bookId: book.id,
            title: book.title,
            lang: "tr",
            readerContractVersion: "HTML_READER_CONTRACT_v1",
            contentRevision: `2026-01-18-html-golden-${book.folderName}`,
            isGolden: true,
            allowAutoRewrite: false,
            totalGlobalPages: globalPageOffset,
            threshold: 1500,
            sections: manifestSections
        };
        fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');
        console.log(`  -> Generated Manifest: ${manifestPath} (Pages: ${globalPageOffset})`);

        // SAVE JSON DATABASE
        const jsonSlug = book.folderName.split('_')[1]; // e.g. sualar
        const jsonPath = path.join(__dirname, `../assets/risale_json/${jsonSlug}.json`);
        // Ensure dir exists
        const jsonDir = path.dirname(jsonPath);
        if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });

        fs.writeFileSync(jsonPath, JSON.stringify({ blocks: allBookBlocks }, null, 2), 'utf8');
        console.log(`  -> Generated JSON DB: ${jsonPath} (Blocks: ${allBookBlocks.length})`);

        manifestData.folderName = book.folderName;
        allManifests.push(manifestData);
    }

    generateTsManifest(allManifests);
    console.log("\nPipeline Complete.");
}

function generateTsManifest(manifests) {
    const tsPath = path.join(__dirname, '../src/features/reader/html/htmlManifest.generated.ts');
    let tsContent = `// AUTO-GENERATED BY compile-content.js
// DO NOT EDIT MANUALLY

export type HtmlChapter = {
    id: string;
    title: string;
    assetPath: string;
    pageCount: number;
    startPage: number;
};

export type HtmlBook = {
    id: string;
    title: string;
    chapters: HtmlChapter[];
};

export const HTML_BOOKS: Record<string, HtmlBook> = {
`;

    manifests.forEach(m => {
        tsContent += `    "${m.bookId}": {\n`;
        tsContent += `        id: "${m.bookId}",\n`;
        tsContent += `        title: "${m.title}",\n`;
        tsContent += `        chapters: [\n`;
        m.sections.forEach(s => {
            const assetPath = `risale_html_pilot/${m.folderName}/${s.file}`;
            tsContent += `            {\n`;
            tsContent += `                id: "${s.sectionId}",\n`;
            tsContent += `                title: "${s.title}",\n`;
            tsContent += `                assetPath: "${assetPath}",\n`;
            tsContent += `                pageCount: ${s.pageCount},\n`;
            tsContent += `                startPage: ${s.startPage},\n`;
            tsContent += `            },\n`;
        });
        tsContent += `        ]\n`;
        tsContent += `    },\n`;
    });

    tsContent += `};\n`;

    fs.writeFileSync(tsPath, tsContent, 'utf8');
    console.log(`  -> Generated TS Manifest: ${tsPath}`);
}

function download(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`Status ${res.statusCode}`));
            }
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data).toString('utf8')));
            res.on('error', reject);
        }).on('error', reject);
    });
}

run();
