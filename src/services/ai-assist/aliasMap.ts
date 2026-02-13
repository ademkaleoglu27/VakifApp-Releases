/**
 * aliasMap.ts
 * Semantic alias mappings for Turkish/Ottoman theological terms.
 * Used for both Lugat fallback suggestions and Search query expansion.
 * 
 * Each key maps to an array of semantically related terms that can be
 * used as alternatives when the original term is not found.
 */

export const ALIAS_MAP: Record<string, string[]> = {
    // ============================================================================
    // İNSAN KAVRAMLARI (Human Concepts) - 15 entries
    // ============================================================================
    'insan': ['beşer', 'insaniyet', 'nev-i beşer', 'âdemoğlu', 'fıtrat', 'insanî', 'benî âdem'],
    'beşer': ['insan', 'insaniyet', 'nev-i beşer', 'benî âdem', 'âdemoğlu'],
    'insaniyet': ['beşeriyet', 'insan', 'insanlık', 'nev-i beşer'],
    'fıtrat': ['yaratılış', 'tabiat', 'hilkat', 'cibillet', 'seciye'],
    'ruh': ['can', 'nefis', 'latife', 'cevher-i ruh', 'rûh'],
    'nefis': ['nefs', 'benlik', 'ego', 'hevâ', 'nefs-i emmâre'],
    'akıl': ['ukul', 'zihin', 'fehim', 'idrak', 'şuur', 'iz\'an'],
    'kalp': ['kalb', 'gönül', 'fuad', 'dil', 'sine'],
    'vicdan': ['hâkim-i vicdanî', 'vicdanî', 'insaf'],
    'irade': ['irâde', 'meşiet', 'dilek', 'azim', 'karar'],
    'his': ['duygu', 'hissiyat', 'ihsas'],
    'hafıza': ['hâfıza', 'zihin', 'şuur'],
    'hayal': ['hayâl', 'tahayyül', 'musavvire'],
    'lisan': ['dil', 'zebân', 'nutuk'],
    'göz': ['basar', 'nazar', 'çeşm'],

    // ============================================================================
    // İMAN KAVRAMLARI (Faith Concepts) - 20 entries
    // ============================================================================
    'iman': ['îman', 'itikat', 'tasdik', 'yakîn', 'iz\'an', 'itikad'],
    'küfür': ['inkâr', 'dalalet', 'şirk', 'ilhad', 'küfr'],
    'hidayet': ['hidâyet', 'irşad', 'doğru yol', 'sırat-ı müstakim', 'rüşd'],
    'dalalet': ['dalâlet', 'sapkınlık', 'inhiraf', 'sapıklık'],
    'şirk': ['şerik koşmak', 'teşrik', 'putperestlik'],
    'tevhid': ['tevhîd', 'birlemek', 'vahdaniyet', 'birlik'],
    'marifet': ['irfan', 'ma\'rifetullah', 'ilm-i ilahi', 'mârifet'],
    'mümin': ['mü\'min', 'ehl-i iman', 'muvahhid'],
    'kafir': ['kâfir', 'münkir', 'mülhid'],
    'münafık': ['nifak ehli', 'iki yüzlü'],
    'ehl-i iman': ['müminler', 'ehl-i hak', 'ehl-i tevhid'],
    'ehl-i küfür': ['kafirler', 'ehl-i dalalet'],
    'ehl-i kitap': ['ehl-i kitâb', 'hristiyan', 'yahudi'],
    'risalet': ['risâlet', 'peygamberlik', 'nübüvvet'],
    'nübüvvet': ['peygamberlik', 'risalet', 'nübüvve'],
    'velayet': ['velâyet', 'velîlik', 'evliyalık'],
    'keramet': ['kerâmet', 'mucize', 'hârikulâde'],
    'mucize': ['mu\'cize', 'keramet', 'harika'],
    'vahiy': ['vahy', 'ilham', 'tenzil'],
    'ilham': ['ilhâm', 'varidat', 'sünuhat'],

    // ============================================================================
    // DUYGULAR (Emotions) - 15 entries
    // ============================================================================
    'yeis': ['ümitsizlik', 'me\'yusiyet', 'nevmid', 'nevmidî', 'ye\'s'],
    'ümit': ['recâ', 'emel', 'rica', 'ümîd', 'umut'],
    'teselli': ['tesliye', 'tefaric', 'avuntu', 'tesellî'],
    'sabır': ['tahammül', 'metanet', 'sebat', 'sabr', 'dayanıklılık'],
    'şükür': ['şükr', 'hamd', 'minnetdarlık', 'teşekkür'],
    'korku': ['havf', 'haşyet', 'mehafet', 'korkmak'],
    'muhabbet': ['sevgi', 'aşk', 'hubb', 'meveddet', 'mahabbet'],
    'buğz': ['nefret', 'adavet', 'düşmanlık', 'husumet'],
    'hüzün': ['keder', 'gam', 'elem', 'teessür', 'üzüntü'],
    'sevinç': ['sürur', 'ferah', 'meserret', 'inşirah', 'neşe'],
    'rıza': ['rızâ', 'hoşnutluk', 'memnuniyet', 'kabul'],
    'gazap': ['öfke', 'kızgınlık', 'hiddet', 'gazab'],
    'hayret': ['şaşkınlık', 'taaccüp', 'hayranlık'],
    'merhamet': ['şefkat', 'acıma', 'rikkat'],
    'şefkat': ['merhamet', 'acıma', 're\'fet', 'şefkât'],

    // ============================================================================
    // MUSİBET VE HASTALIK (Affliction and Illness) - 12 entries
    // ============================================================================
    'musibet': ['belâ', 'âfet', 'felâket', 'nekbet', 'musîbet', 'mihnet'],
    'hastalık': ['maraz', 'illet', 'dert', 'sakam', 'emraz', 'maraza'],
    'ölüm': ['mevt', 'ecel', 'vefat', 'irtihal', 'fevt', 'memât'],
    'bela': ['musibet', 'âfet', 'mihnet', 'felâket', 'belâ'],
    'dert': ['illet', 'maraz', 'gam', 'keder', 'ıstırap'],
    'şifa': ['şifâ', 'âfiyet', 'sıhhat', 'devâ', 'iyileşme'],
    'ağrı': ['elem', 'vecâ', 'ıztırap', 'acı'],
    'ihtiyarlık': ['yaşlılık', 'pîrlik', 'şeyhuhet'],
    'kabir': ['mezar', 'lahd', 'çukur', 'türbe'],
    'berzah': ['kabir âlemi', 'ara âlem'],
    'haşir': ['haşr', 'dirilme', 'ba\'s'],
    'kıyamet': ['kıyâmet', 'son gün', 'yevm-i kıyâmet'],

    // ============================================================================
    // DİNİ KAVRAMLAR (Religious Concepts) - 20 entries
    // ============================================================================
    'ibadet': ['ubudiyet', 'kulluk', 'taat', 'amel', 'ibâdet'],
    'namaz': ['salât', 'salat', 'kıyam', 'rükû', 'secde'],
    'dua': ['münâcat', 'niyaz', 'tazarru', 'du\'a', 'yalvarış'],
    'zikir': ['tesbih', 'tahmid', 'tekbir', 'zikrullah', 'zikr'],
    'tefekkür': ['teemmül', 'düşünce', 'fikir', 'tedebbür', 'fikr'],
    'tevekkül': ['güven', 'itimat', 'tawakkul', 'Allah\'a bırakma'],
    'tövbe': ['tevbe', 'istiğfar', 'pişmanlık', 'inabe', 'geri dönme'],
    'takva': ['takvâ', 'vera', 'sakınma', 'perhizkârlık', 'günahtan kaçınma'],
    'ihlas': ['ihlâs', 'samimiyet', 'hâlisane', 'sırf Allah için'],
    'riya': ['gösteriş', 'süm\'a', 'riyakârlık', 'riyâ'],
    'nifak': ['münafıklık', 'iki yüzlülük'],
    'oruç': ['savm', 'sıyam', 'ramazan'],
    'zekat': ['zekât', 'sadaka', 'öşür'],
    'hac': ['hacc', 'kâbe ziyareti'],
    'kurban': ['kurbân', 'udhiye'],
    'farz': ['farz-ı ayn', 'vacip', 'gerekli'],
    'sünnet': ['sünnet-i seniyye', 'edep'],
    'helal': ['helâl', 'mübah', 'caiz'],
    'haram': ['harâm', 'yasak', 'günah'],
    'sevap': ['sevâb', 'ecir', 'mükâfat'],

    // ============================================================================
    // AHLAK (Ethics) - 15 entries
    // ============================================================================
    'kibir': ['tekebbür', 'gurur', 'ucub', 'enaniyet', 'büyüklenme'],
    'tevazu': ['mahviyet', 'alçakgönüllülük', 'tezellül', 'mütevazılık'],
    'haset': ['kıskançlık', 'gıpta', 'hased', 'çekememezlik'],
    'cömertlik': ['sehâvet', 'kerem', 'cûd', 'eli açıklık'],
    'cimrilik': ['hırs', 'buhl', 'şuhh', 'pintiliık'],
    'yalan': ['kizb', 'yalancılık', 'iftira', 'kizb'],
    'doğruluk': ['sıdk', 'sadakat', 'istikâmet', 'dürüstlük'],
    'adalet': ['adâlet', 'hak', 'insaf', 'kıst', 'hakkaniyyet'],
    'zulüm': ['haksızlık', 'cevr', 'gadab', 'zulm'],
    'hıyanet': ['ihanet', 'vefasızlık', 'aldatma'],
    'emanet': ['emânet', 'güven', 'sadakat'],
    'vefa': ['vefâ', 'sadakat', 'ahde vefa'],
    'edep': ['edeb', 'terbiye', 'ahlak'],
    'hayâ': ['utanma', 'ar', 'edep'],
    'iffet': ['namus', 'temizlik', 'ifet'],

    // ============================================================================
    // VARLIK (Existence) - 12 entries
    // ============================================================================
    'vücud': ['varlık', 'mevcudiyet', 'var olmak', 'vücûd'],
    'yokluk': ['adem', 'fenâ', 'zevâl', 'hiçlik', 'yok olmak'],
    'hayat': ['can', 'yaşam', 'zindegî', 'ömür'],
    'memat': ['ölüm', 'mevt', 'fevat'],
    'dünya': ['cihan', 'âlem', 'kevn', 'kâinat', 'arz'],
    'ahiret': ['âhiret', 'ukbâ', 'dâr-ı beka', 'âlem-i bâkî', 'ebediyet'],
    'cennet': ['firdevs', 'adn', 'naim', 'hüld', 'cennet-i âlâ'],
    'cehennem': ['nâr', 'ateş', 'cahîm', 'hâviye', 'tamu'],
    'alem': ['âlem', 'dünya', 'kâinat', 'cihan'],
    'arş': ['arş-ı âlâ', 'en yüksek makam'],
    'levh-i mahfuz': ['levh-i mahfûz', 'kader levhası'],
    'alem-i misal': ['misal âlemi', 'berzah âlemi'],

    // ============================================================================
    // BİLGİ (Knowledge) - 10 entries
    // ============================================================================
    'ilim': ['marifet', 'irfan', 'tahsil', 'ilm', 'bilgi'],
    'cehalet': ['cehl', 'cahillik', 'bilgisizlik', 'cehâlet'],
    'hikmet': ['sır', 'gaye', 'maksat', 'felsefe', 'akıl'],
    'hakikat': ['hakîkat', 'gerçek', 'asl', 'asıl', 'doğru'],
    'sır': ['esrar', 'gizem', 'hafiyat', 'rumuz'],
    'burhan': ['delil', 'ispat', 'hüccet'],
    'delil': ['burhan', 'ispat', 'kanıt'],
    'hüccet': ['delil', 'burhan', 'sened'],
    'kanaat': ['kanaât', 'yeterlilik', 'doyum'],
    'yakîn': ['kesinlik', 'şüphesizlik', 'mutlak bilgi'],

    // ============================================================================
    // ZAMAN (Time) - 8 entries
    // ============================================================================
    'ezel': ['ezelde', 'kadîm', 'öncesizlik', 'lâyezalî', 'ezelden beri'],
    'ebed': ['ebediyet', 'sonsuzluk', 'sermediyet', 'bâkî', 'ebedî'],
    'zaman': ['vakit', 'dem', 'ân', 'çağ', 'devir'],
    'kader': ['takdir', 'mukadderat', 'kısmet', 'yazgı', 'alın yazısı'],
    'kaza': ['hüküm', 'icra', 'infaz', 'kaderin icrası'],
    'an': ['ân', 'lahza', 'dem'],
    'devir': ['devre', 'çağ', 'zaman dilimi'],
    'asır': ['yüzyıl', 'çağ', 'kurun'],

    // ============================================================================
    // KUDRETİLAHİ (Divine Power) - 12 entries
    // ============================================================================
    'kudret': ['kuvvet', 'iktidar', 'güç', 'kadir', 'kudret-i ilahiye'],
    'rahmet': ['merhamet', 'şefkat', 're\'fet', 'lutuf', 'ihsan'],
    'nimet': ['ni\'met', 'ihsan', 'ata', 'hediye', 'bağış'],
    'azap': ['ceza', 'ukubet', 'ıztırap', 'azâb'],
    'lütuf': ['ihsan', 'kerem', 'fazıl', 'inn\'am', 'bağış'],
    'celal': ['celâl', 'büyüklük', 'azamet'],
    'cemal': ['cemâl', 'güzellik', 'hüsn'],
    'kemal': ['kemâl', 'olgunluk', 'mükemmellik'],
    'esma': ['esmâ', 'isimler', 'esma-i hüsna'],
    'sıfat': ['sıfât', 'nitelikler', 'özellikler'],
    'tecelli': ['tecellî', 'görünme', 'yansıma'],
    'feyz': ['feyiz', 'bereket', 'ilham'],

    // ============================================================================
    // RİSALE ÖZEL TERİMLER (Risale-Specific Terms) - 20 entries
    // ============================================================================
    'nur': ['nûr', 'ışık', 'ziya', 'aydınlık'],
    'zulmet': ['karanlık', 'zulümat', 'kesafet'],
    'sünuhat': ['ilham', 'varidat', 'kalbe doğan'],
    'ene': ['benlik', 'ego', 'nefis', 'ben'],
    'mana': ['mânâ', 'anlam', 'medlul', 'fehva'],
    'suret': ['sûret', 'şekil', 'görünüş', 'zahir'],
    'misal': ['misâl', 'örnek', 'mesel', 'temsil'],
    'temsil': ['temâsil', 'örnek', 'mesel', 'benzetme'],
    'lem\'a': ['parıltı', 'şule', 'nur parçası', 'lemalar'],
    'şule': ['alev', 'lem\'a', 'nur'],
    'şua': ['şuâ', 'ışın', 'parıltı', 'şualar'],
    'işarat': ['işarât', 'işaretler', 'ipuçları'],
    'mektubat': ['mektuplar', 'risaleler'],
    'sözler': ['kelimeler', 'risaleler'],
    'barla': ['isparta', 'köy'],
    'külliyat': ['bütün eserler', 'eserler', 'tam koleksiyon'],
    'talebe': ['öğrenci', 'talebe-i ulûm', 'şakirt'],
    'üstad': ['üstâd', 'hoca', 'mürşid'],
    'said nursi': ['bediüzzaman', 'üstad', 'said nursî'],
    'bediüzzaman': ['said nursi', 'üstad', 'zamanın harikası'],

    // ============================================================================
    // OSMANLI/TELAFFUZ VARYANTLARI (Spelling Variants) - 15 entries
    // ============================================================================
    'hakîkat': ['hakikat', 'gerçek'],
    'şefkât': ['şefkat', 'merhamet'],
    'mü\'min': ['mümin', 'inanan'],
    'kur\'an': ['kuran', 'kur\'ân', 'kelam-ı ilahi'],
    'kuran': ['kur\'an', 'kur\'ân', 'kelam-ı ilahi'],
    'allah': ['cenab-ı hak', 'mevla', 'rab', 'ilah'],
    'cenab-ı hak': ['allah', 'mevla', 'hâlik'],
    'peygamber': ['resul', 'nebi', 'elçi'],
    'muhammed': ['peygamber efendimiz', 'hz. muhammed', 'rasulullah'],
    'rasulullah': ['muhammed', 'peygamberimiz', 'efendimiz'],
    'sahabe': ['sahâbe', 'ashab', 'arkadaşlar'],
    'evliya': ['evliyâ', 'veliler', 'dostlar'],
    'ulema': ['ulemâ', 'alimler', 'bilginler'],
    'melaike': ['melâike', 'melekler'],
    'cin': ['cinn', 'cinler'],

    // ============================================================================
    // ÇOK KELİMELİ TERİMLER (Multi-word Terms) - 10 entries
    // ============================================================================
    'nev-i beşer': ['insanlık', 'beşeriyet', 'insanlar'],
    'talebe-i ulum': ['ilim talebeleri', 'öğrenciler'],
    'ehl-i dünya': ['dünya ehli', 'dünyaperestler'],
    'ehl-i ahiret': ['ahiret ehli', 'zahidler'],
    'ehl-i hakikat': ['hakikat ehli', 'arifler'],
    'esma-i hüsna': ['güzel isimler', 'allah\'ın isimleri'],
    'sırat-ı müstakim': ['doğru yol', 'hidayet yolu'],
    'dar-ı beka': ['ebediyet yurdu', 'ahiret'],
    'dar-ı fena': ['geçici yurt', 'dünya'],
};

/**
 * Reverse lookup: Given a term, find what it's an alias of.
 * This is useful for search expansion.
 */
export function findAliasesFor(term: string): string[] {
    const normalized = term.toLowerCase();
    const result: string[] = [];

    // Direct lookup
    if (ALIAS_MAP[normalized]) {
        result.push(...ALIAS_MAP[normalized]);
    }

    // Reverse lookup: find keys where this term appears as alias
    for (const [key, aliases] of Object.entries(ALIAS_MAP)) {
        if (aliases.some(a => a.toLowerCase() === normalized)) {
            result.push(key);
            // Also add other aliases of the same key
            result.push(...aliases.filter(a => a.toLowerCase() !== normalized));
        }
    }

    // Deduplicate and remove the original term
    return Array.from(new Set(result)).filter(r => r.toLowerCase() !== normalized);
}

/**
 * Expands a search query with aliases.
 * Returns the original query plus expanded versions.
 */
export function expandQueryWithAliases(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/);
    const expanded: Set<string> = new Set([query]);

    for (const word of words) {
        const aliases = findAliasesFor(word);
        for (const alias of aliases.slice(0, 3)) { // Limit to top 3 aliases per word
            // Replace the word with alias in the original query
            const newQuery = query.toLowerCase().replace(word, alias);
            expanded.add(newQuery);
        }
    }

    return Array.from(expanded);
}

/**
 * Gets the top N alias suggestions for a term.
 * Prioritizes direct matches over reverse lookups.
 */
export function getTopAliases(term: string, limit: number = 5): string[] {
    const aliases = findAliasesFor(term);
    return aliases.slice(0, limit);
}
