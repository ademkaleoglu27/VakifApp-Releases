const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'risale_source_data', 'obsidian-markdown');

function checkSorting() {
    console.log('--- Checking Volume 1 (Sözler) Sorting ---');

    // Find Book 1 Directory
    const items = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });
    const bookDir = items.find(item => item.isDirectory() && item.name.startsWith('01'));

    if (!bookDir) {
        console.error('Book 01 not found');
        return;
    }

    const bookPath = path.join(SOURCE_DIR, bookDir.name);
    const files = fs.readdirSync(bookPath).filter(f => f.endsWith('.md'));

    // 1. Lexicographic Sort (Current Behavior?)
    const lexico = [...files].sort();
    console.log('\n--- Lexicographic Sort (First 10) ---');
    console.log(lexico.slice(0, 10));

    // 2. Natural Sort (Desired)
    const natural = [...files].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    console.log('\n--- Natural Sort (First 10) ---');
    console.log(natural.slice(0, 10));

    // Compare
    const diffIndex = lexico.findIndex((f, i) => f !== natural[i]);
    if (diffIndex !== -1) {
        console.log(`\n!!! MISMATCH FOUND at index ${diffIndex} !!!`);
        console.log(`Lexico: ${lexico[diffIndex]}`);
        console.log(`Natural: ${natural[diffIndex]}`);
    } else {
        console.log('\nNo sorting mismatch found in first 10 files.');
    }
}

checkSorting();
