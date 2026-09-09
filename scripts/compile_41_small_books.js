const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../raw_books/rnk_nesriyat/kucuk_kitaplar');
const outBaseDir = path.join(__dirname, '../assets/risale_html_pilot');
const manifestPath = path.join(srcDir, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
    console.error('Manifest not found:', manifestPath);
    process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
console.log(`Processing ${manifest.length} small books...`);

const htmlBooksMap = {};

function formatTextToHtml(rawText, bookTitle) {
    // Process text page by page or paragraph by paragraph
    const lines = rawText.split('\n');
    let html = '';
    let inParagraph = false;
    let currentPage = null;

    function closeParagraph() {
        if (inParagraph) {
            html += '</p>\n';
            inParagraph = false;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // Empty line
        if (!line) {
            closeParagraph();
            continue;
        }

        // Page marker: #123
        const pageMatch = line.match(/^#(\d+)/);
        if (pageMatch) {
            closeParagraph();
            currentPage = pageMatch[1];
            html += `<div class="page-marker-wrap"><span class="page-marker" id="page-${currentPage}">Sayfa ${currentPage}</span></div>\n`;
            line = line.replace(/^#\d+\s*/, '').trim();
            if (!line) continue;
        }

        // Arabic block with optional meal id: ~...|ID@ or ~...|...
        if (line.startsWith('~')) {
            closeParagraph();
            let arabicText = line.substring(1);
            let mealId = '';
            const mealMatch = arabicText.match(/\|(\d+)@?$/);
            if (mealMatch) {
                mealId = mealMatch[1];
                arabicText = arabicText.replace(/\|\d+@?$/, '');
            } else {
                arabicText = arabicText.replace(/\|.*$/, '');
            }
            arabicText = arabicText.trim();
            html += `<div class="arabic-block" ${mealId ? `data-meal-id="${mealId}"` : ''} dir="rtl">${arabicText}</div>\n`;
            continue;
        }

        // Headings: &Title> or <Title>
        const headingMatch = line.match(/^[&<](.*?)[>>]/);
        if (headingMatch) {
            closeParagraph();
            const hText = headingMatch[1].trim();
            html += `<h2 class="heading-2">${hText}</h2>\n`;
            continue;
        }

        // Star dividers: ,* * *> or * * *
        if (line.includes('* * *')) {
            closeParagraph();
            html += `<div style="text-align:center; margin: 18px 0; color: #888; letter-spacing: 4px;">* * *</div>\n`;
            continue;
        }

        // Regular text line
        // Clean special tags like \Hitap> or §İmza
        let cleaned = line
            .replace(/\\(.*?)[>]/g, '<strong>$1</strong> ')
            .replace(/§/g, '')
            .replace(/,∫/g, '')
            .replace(/÷/g, '');

        if (!inParagraph) {
            html += `<p class="paragraph">${cleaned}`;
            inParagraph = true;
        } else {
            html += ` ${cleaned}`;
        }
    }

    closeParagraph();
    return html;
}

function generateHtmlPage(title, bodyContent) {
    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
<title>${title}</title>
<style>
  :root {
    --bg: #f5eedc;
    --text: #2a2421;
    --heading: #8b0000;
    --arabic: #8b0000;
    --base-size: 19px;
    --line-height: 1.68;
    --font-family: 'Barla', "Crimson Pro", "Times New Roman", serif;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--text);
    box-sizing: border-box;
    -webkit-text-size-adjust: 100%;
  }
  body {
    font-family: var(--font-family);
    font-size: var(--base-size);
    line-height: var(--line-height);
    padding: 24px 20px 120px;
    text-align: justify;
    text-justify: inter-word;
    -webkit-hyphens: auto;
    hyphens: auto;
    -webkit-user-select: text;
    user-select: text;
  }
  h1, h2, h3, .heading-1, .heading-2, .heading-3 {
    font-family: var(--font-family);
    color: var(--heading);
    text-align: center;
    margin: 28px 0 16px;
    font-weight: bold;
    letter-spacing: 0.5px;
  }
  .heading-2 { font-size: 1.35em; }
  .heading-3 { font-size: 1.15em; }
  .subtitle {
    text-align: center;
    font-style: italic;
    color: #665c54;
    margin: -8px 0 16px;
    font-size: 0.95em;
  }
  .paragraph, p {
    margin: 0 0 14px;
    text-indent: 18px;
    overflow-wrap: break-word;
  }
  .arabic-block {
    font-family: 'ScheherazadeNew', "Noto Naskh Arabic", serif;
    color: var(--arabic);
    text-align: center !important;
    font-size: 1.35em;
    line-height: 2.0;
    padding: 10px 0;
    margin: 16px 0;
    display: block;
    direction: rtl;
    text-indent: 0 !important;
    cursor: pointer;
  }
  .arabic-block:active {
    background-color: rgba(139, 0, 0, 0.08);
    border-radius: 6px;
  }
  .page-marker-wrap {
    position: -webkit-sticky;
    position: sticky;
    top: 10px;
    z-index: 100;
    display: flex;
    justify-content: flex-end;
    pointer-events: none;
    margin-top: -12px;
    margin-bottom: 8px;
  }
  .page-marker {
    opacity: 0.88;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.8px;
    padding: 3px 8px;
    border-radius: 8px;
    background: rgba(0,0,0,0.06);
    color: rgba(0,0,0,0.7);
    font-family: sans-serif;
    backdrop-filter: blur(2px);
  }
</style>
<script>
(function() {
  function send(type, payload) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {})));
    }
  }
  document.addEventListener('click', function(e) {
    var arabic = e.target.closest('.arabic-block');
    if (arabic) {
      e.preventDefault();
      var text = arabic.innerText;
      var mealId = arabic.getAttribute('data-meal-id');
      send('AYET_CLICK', { text: text, mealId: mealId });
    }
  });
})();
</script>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

// Generate for each of the 41 books
const generatedManifestEntries = [];

manifest.forEach((book, index) => {
    const bookFolder = `kucuk_${book.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const targetDir = path.join(outBaseDir, bookFolder);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const metinPath = path.join(srcDir, book.metin);
    if (!fs.existsSync(metinPath)) {
        console.warn(`File missing for ${book.title}: ${metinPath}`);
        return;
    }

    const rawText = fs.readFileSync(metinPath, 'utf-8');
    const bodyHtml = formatTextToHtml(rawText, book.title);
    const fullHtml = generateHtmlPage(book.title, bodyHtml);

    const filename = `01_main.html`;
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, fullHtml, 'utf-8');

    const totalPages = (book.bitis - book.baslangic) + 1;
    const bookKey = `risale.${book.id}@diyanet.tr`;

    generatedManifestEntries.push({
        key: bookKey,
        id: bookKey,
        title: book.title,
        category: "Küçük Kitaplar",
        startPage: book.baslangic,
        pageCount: totalPages,
        assetPath: `risale_html_pilot/${bookFolder}/${filename}`
    });

    console.log(`Generated [${index + 1}/41]: ${book.title} -> ${bookFolder}/${filename} (${totalPages} pages)`);
});

// Save generated small books manifest snippet
const scratchDir = path.join(__dirname, '../scratch');
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
fs.writeFileSync(
    path.join(scratchDir, 'generated_small_books.json'),
    JSON.stringify(generatedManifestEntries, null, 2),
    'utf-8'
);

console.log(`\nSuccessfully compiled all ${generatedManifestEntries.length} small books!`);
