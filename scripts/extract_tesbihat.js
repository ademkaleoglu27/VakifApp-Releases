const fs = require('fs');
const path = require('path');

// 1. Read the source file
const sourcePath = path.join(__dirname, '../temp_zakir_analysis/src/components/tesbihat/dualar.js');
let sourceCode = fs.readFileSync(sourcePath, 'utf8');

// 2. Modify code to make it runnable in Node (remove export)
// Replace "export const dualar =" with "const dualar =" and add module.exports
sourceCode = sourceCode.replace('export const dualar =', 'const dualar =');
sourceCode += '\nmodule.exports = dualar;';

// 3. Write to a temporary file to require it
const tempFile = path.join(__dirname, 'temp_dualar.js');
fs.writeFileSync(tempFile, sourceCode);

// 4. Require the data
const dualar = require('./temp_dualar.js');

// 5. Transform structure if needed (optional)
// For now, we keep the structure but maybe add titles if missing
const tesbihatData = {
    metadata: {
        source: "https://github.com/alitekdemir/zakir2025",
        extracted_at: new Date().toISOString()
    },
    sections: []
};

// Map keys to readable titles (based on typical naming or the keys themselves)
const titles = {
    tuncina: "Salaten Tuncina",
    selam: "Entesselam",
    nukaddimu: "Nukaddimu",
    amenna: "Amenna",
    tevhid: "Tevhid",
    ecirna: "Ecirna (Cehennemden Sığınma)",
    sallisellim: "Salli ve Sellim",
    elfu: "Elfu Elfi Salatin",
    kesira: "Kesira",
    subhanallahi: "Subhanallahi",
    tesbih: "Tesbih (99'luk)",
    dua: "Dua",
    falemennehu: "Fa'lem Ennehu",
    salavatlar: "Salavatlar",
    biadedievrakil: "Bi Adedi Evrakil",
    ismiazam: "İsm-i Azam",
    tercuman: "Tercüman-ı İsm-i Azam",
    tercumandua: "Tercüman-ı İsm-i Azam Duası",
    ismiazamdua: "İsm-i Azam Duası"
};

for (const [key, value] of Object.entries(dualar)) {
    tesbihatData.sections.push({
        id: key,
        title: titles[key] || key,
        content: value
    });
}

// 6. Write JSON output
const outputPath = path.join(__dirname, '../assets/tesbihat.json');
// Ensure assets dir exists
if (!fs.existsSync(path.join(__dirname, '../assets'))) {
    fs.mkdirSync(path.join(__dirname, '../assets'));
}

fs.writeFileSync(outputPath, JSON.stringify(tesbihatData, null, 2));

console.log(`Successfully extracted Tesbihat data to ${outputPath}`);
console.log(`Total sections: ${tesbihatData.sections.length}`);

// 7. Cleanup
try {
    fs.unlinkSync(tempFile);
} catch (e) {
    // ignore
}
