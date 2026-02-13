const fs = require('fs');
const path = require('path');

// MOCK CONTENT: "Birinci Söz" (Diyanet Approved Text)
// This mimics the clean Markdown we would get from the repo.
const markdownContent = `
# Birinci Söz

بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحٖيمِ

وَ بِهٖ نَسْتَعٖينُ

اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمٖينَ وَ الصَّلَاةُ وَ السَّلَامُ عَلٰى سَيِّدِنَا مُحَمَّدٍ وَ عَلٰى اٰلِهٖ وَ صَحْبِهٖ اَجْمَعٖينَ

Ey kardeş! Benden birkaç nasihat istedin. Sen bir asker olduğun için askerlik temsilatıyla, sekiz hikâyecikler ile birkaç hakikati nefsimle beraber dinle. Çünkü ben nefsimi herkesten ziyade nasihate muhtaç görüyorum. Vaktiyle sekiz âyetten istifade ettiğim sekiz sözü biraz uzunca nefsime demiştim. Şimdi kısaca ve avam lisanıyla nefsime diyeceğim. Kim isterse beraber dinlesin.

## Birinci Söz

**Bismillah** her hayrın başıdır. Biz dahi başta ona başlarız. Bil ey nefsim, şu mübarek kelime İslâm nişanı olduğu gibi bütün mevcudatın lisan-ı haliyle vird-i zebanıdır.

**Bismillah** ne büyük tükenmez bir kuvvet, ne çok bitmez bir bereket olduğunu anlamak istersen şu temsilî hikâyeciğe bak, dinle. Şöyle ki:

Bedevî Arap çöllerinde seyahat eden adama gerektir ki bir kabile reisinin ismini alsın ve himayesine girsin, tâ şakîlerin şerrinden kurtulup hâcatını tedarik edebilsin. Yoksa tek başıyla hadsiz düşman ve ihtiyacatına karşı perişan olacaktır.

İşte böyle bir seyahat için iki adam sahraya çıkıp gidiyorlar. Onlardan birisi mütevazi idi, diğeri mağrur. Mütevazii, bir reisin ismini aldı. Mağrur, almadı. Alanı, her yerde selâmetle gezdi. Bir kātıu’t-tarîke rast gelse der: “Ben, filan reisin ismiyle gezerim.” Şakî def’olur, ilişemez. Bir çadıra girse o nam ile hürmet görür. Öteki mağrur, bütün seyahatinde öyle belalar çeker ki tarif edilmez. Daima titrer, daima dilencilik ederdi. Hem zelil hem rezil oldu.

İşte ey mağrur nefsim, sen o seyyahsın. Şu dünya ise bir çöldür. Aczin ve fakrın hadsizdir. Düşmanın, hâcatın nihayetsizdir. Madem öyledir, şu sahranın Mâlik-i Ebedî’si ve Hâkim-i Ezelî’sinin ismini al. Tâ bütün kâinatın dilenciliğinden ve her hâdisatın karşısında titremeden kurtulasın.

Evet, bu kelime öyle mübarek bir definedir ki senin nihayetsiz aczin ve fakrın, seni nihayetsiz kudrete, rahmete rabtedip Kadîr-i Rahîm’in dergâhında aczi, fakrı en makbul bir şefaatçi yapar.

Evet, bu kelime ile hareket eden, o adama benzer ki askere kaydolur, devlet namına hareket eder. Hiçbir kimseden pervası kalmaz. Kanun namına, devlet namına der, her işi yapar, her şeye karşı dayanır.

Başta demiştik: Bütün mevcudat, lisan-ı hal ile **Bismillah** der. Öyle mi?

Evet, nasıl ki görsen, bir tek adam geldi, bütün şehir ahalisini cebren bir yere sevk etti ve cebren işlerde çalıştırdı. Yakînen bilirsin; o adam kendi namıyla, kendi kuvvetiyle hareket etmiyor. Belki o, bir askerdir, devlet namına hareket eder, bir padişah kuvvetine istinad eder.

Öyle de her şey, Cenab-ı Hakk’ın namına hareket eder ki zerrecikler gibi tohumlar, çekirdekler başlarında koca ağaçları taşıyor, dağ gibi yükleri kaldırıyorlar.

Demek her bir ağaç, **Bismillah** der. Hazine-i rahmet meyvelerinden ellerini dolduruyor, bizlere tablacılık ediyor.

Her bir bostan, **Bismillah** der. Matbaha-i kudretten bir kazan olur ki çeşit çeşit, pek çok muhtelif leziz taamlar, içinde beraber pişiriliyor.

Her bir inek, deve, koyun, keçi gibi mübarek hayvanlar **Bismillah** der. Rahmet feyzinden birer süt çeşmesi olur. Bizlere Rezzak namına en latîf, en nazif, âb-ı hayat gibi bir gıdayı takdim ediyorlar.

Her bir nebat ve ağaç ve otların ipek gibi yumuşak kök ve damarları, **Bismillah** der. Sert olan taş ve toprağı deler, geçer. Allah namına, Rahman namına der, her şey ona musahhar olur. Evet, havada dalların intişarı ve meyve vermesi gibi o sert taş ve topraktaki köklerin kemal-i suhuletle intişar etmesi ve yer altında yemiş vermesi hem şiddet-i hararete karşı aylarca nazik, yeşil yaprakların yaş kalması, tabiiyyunun ağzına şiddetle tokat vuruyor. Kör olası gözüne parmağını sokuyor ve diyor ki:

En güvendiğin salabet ve hararet dahi emir tahtında hareket ediyorlar ki, o ipek gibi yumuşak damarlar, birer asâ-yı Musa (as) gibi فَقُلْنَا اضْرِبْ بِعَصَاكَ الْحَجَرَ emrine imtisal ederek taşları şakkeder. Ve o sigara kâğıdı gibi ince nâzenin yapraklar, birer aza-yı İbrahim (as) gibi ateş saçan hararete karşı يَا نَارُ كُونٖى بَرْدًا وَ سَلَامًا âyetini okuyorlar.

Madem her şey manen **Bismillah** der. Allah namına Allah’ın nimetlerini getirip bizlere veriyorlar. Biz dahi **Bismillah** demeliyiz. Allah namına vermeliyiz, Allah namına almalıyız. Öyle ise Allah namına vermeyen gafil insanlardan almamalıyız.

**Sual:** Tablacı hükmünde olan insanlara bir fiyat veriyoruz. Acaba asıl mal sahibi olan Allah, ne fiyat istiyor?

**Elcevap:** Evet, o Mün’im-i Hakiki, bizden o kıymettar nimetlere, mallara bedel istediği fiyat ise üç şeydir. Biri **zikir**, biri **şükür**, biri **fikir**dir.

Başta **Bismillah** zikirdir.

Âhirde **Elhamdülillah** şükürdür.

Ortada, bu kıymettar hârika-i sanat olan nimetler Ehad-i Samed’in mu’cize-i kudreti ve hediye-i rahmeti olduğunu düşünmek ve derk etmek fikirdir. Bir padişahın kıymettar bir hediyesini sana getiren bir miskin adamın ayağını öpüp hediye sahibini tanımamak ne derece belâhet ise öyle de zahirî mün’imleri medih ve muhabbet edip Mün’im-i Hakiki’yi unutmak, ondan bin derece daha belâhettir.

Ey nefis, böyle ebleh olmamak istersen Allah namına ver, Allah namına al, Allah namına başla, Allah namına işle. Vesselâm.
`;

// ARABIC DETECTION HELPER
function isArabic(text) {
    // Basic range check for Arabic blocks (> 60% arabic chars)
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
    const arabicChars = (text.match(arabicRegex) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 && (arabicChars / totalChars) > 0.6;
}

// CONVERSION LOGIC
function convertMdToHtml(md) {
    const lines = md.split('\n');
    let htmlLines = [];

    // Add file header/wrapper if needed, but existing files are just content divs
    htmlLines.push(`<div class="entry-content">`);

    lines.forEach(line => {
        const text = line.trim();
        if (!text) return;

        if (text.startsWith('# ')) {
            htmlLines.push(`<h1>${text.substring(2)}</h1>`);
        } else if (text.startsWith('## ')) {
            htmlLines.push(`<h2>${text.substring(3)}</h2>`);
        } else if (isArabic(text)) {
            // Apply the 'arabic-block' class directly!
            htmlLines.push(`<div class="arabic-block" dir="rtl">${text}</div>`);
        } else {
            // Basic Markdown parsing
            let content = text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');

            htmlLines.push(`<p>${content}</p>`);
        }
    });

    htmlLines.push(`</div>`);
    return htmlLines.join('\n');
}

// EXECUTION
try {
    const htmlContent = convertMdToHtml(markdownContent);
    const outputPath = path.join(__dirname, '../android/app/src/main/assets/risale_html_pilot/01_sozler/01_01.html');

    fs.writeFileSync(outputPath, htmlContent, 'utf8');
    console.log(`Success: Wrote HTML to ${outputPath}`);
} catch (e) {
    console.error(e);
}
