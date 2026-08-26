/**
 * ZikirPresets
 * Curated list of traditional Islamic prayers, salavats, and Risale-i Nur virds with Arabic, Turkish, and recommended targets.
 */

export interface ZikirItem {
    id: string;
    name: string;
    arabic: string;
    turkish: string;
    meaning: string;
    virtue: string;
    defaultTarget: number;
    category: 'salavat' | 'tesbih' | 'tevhid' | 'istigfar' | 'risale' | 'ozel';
}

export const ZIKIR_PRESETS: ZikirItem[] = [
    {
        id: 'tevhid',
        name: 'Kelime-i Tevhid',
        arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ مُحَمَّدٌ رَسُولُ اللّٰهِ',
        turkish: 'Lâ ilâhe illallâh Muhammedü’r-Rasûlullâh',
        meaning: 'Allah’tan başka ilâh yoktur, Muhammed O’nun elçisidir.',
        virtue: 'Zikirlerin en faziletlisi Kelime-i Tevhid’dir. İmanı tazeler ve kalbi nurlandırır.',
        defaultTarget: 100,
        category: 'tevhid',
    },
    {
        id: 'salavat',
        name: 'Salavât-ı Şerife',
        arabic: 'اَللّٰهُمَّ صَلِّ عَلٰى سَيِّدِنَا مُحَمَّدٍ وَعَلٰى آلِ سَيِّدِنَا مُحَمَّدٍ',
        turkish: 'Allâhümme salli alâ seyyidinâ Muhammedin ve alâ âli seyyidinâ Muhammed',
        meaning: 'Allah’ım! Efendimiz Muhammed’e ve onun âline salât ve selâm eyle.',
        virtue: 'Bana bir salavat getirene Allah on rahmet eder, on günahını bağışlar ve derecesini on kat yükseltir.',
        defaultTarget: 100,
        category: 'salavat',
    },
    {
        id: 'istigfar',
        name: 'Seyyidü’l-İstiğfar & Tövbe',
        arabic: 'أَسْتَغْفِرُ اللّٰهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ',
        turkish: 'Estağfirullâhe’l-Azîm ve etûbü ileyh',
        meaning: 'Yüce Allah’tan mağfiret diler ve O’na tevbe ederim.',
        virtue: 'İstiğfara devam edene Allah her darlıktan bir çıkış, her kederden bir ferahlık verir.',
        defaultTarget: 100,
        category: 'istigfar',
    },
    {
        id: 'subhanallah',
        name: 'Sübhanallâh (Tenzihe)',
        arabic: 'سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ ، سُبْحَانَ اللّٰهِ الْعَظِيمِ',
        turkish: 'Subhânallâhi ve bi-hamdihî, Subhânallâhi’l-Azîm',
        meaning: 'Allah’ı hamd ile tesbih ederim; Yüce Allah her türlü noksanlıktan münezzehtir.',
        virtue: 'Dilde hafif, mizanda pek ağır ve Rahmân’a çok sevimli iki kelimedir.',
        defaultTarget: 33,
        category: 'tesbih',
    },
    {
        id: 'ya_baki',
        name: 'Yâ Bâkî Ente’l-Bâkî (Risale-i Nur Virdi)',
        arabic: 'يَا بَاقِي أَنْتَ الْبَاقِي',
        turkish: 'Yâ Bâkî Ente’l-Bâkî',
        meaning: 'Ey Bâkî olan Allah! Yalnız Sen ebedîsin, Sen’den başka her şey fânidir.',
        virtue: 'Birinci cümlesi masivadan vazgeçirir, ikinci cümlesi ebedi bir Mâbuda kalbi bağlar. Ruhun en büyük tesellisi ve devasıdır. (3. Lem’a)',
        defaultTarget: 99,
        category: 'risale',
    },
    {
        id: 'hasbunallah',
        name: 'Hasbünallâh (Tevekkül)',
        arabic: 'حَسْبُنَا اللّٰهُ وَنِعْمَ الْوَكِيلُ',
        turkish: 'Hasbünallâhu ve ni’me’l-vekîl',
        meaning: 'Allah bize yeter; O ne güzel vekildir.',
        virtue: 'Zorluk ve musibet anlarında en kuvvetli kalkan ve emniyet zırhıdır.',
        defaultTarget: 100,
        category: 'tesbih',
    },
    {
        id: 'la_havle',
        name: 'Lâ Havle (Güç ve Kuvvet)',
        arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ الْعَلِيِّ الْعَظِيمِ',
        turkish: 'Lâ havle ve lâ kuvvete illâ billâhi’l-Aliyyi’l-Azîm',
        meaning: 'Güç ve kuvvet ancak pek yüce ve azamet sahibi olan Allah’a aittir.',
        virtue: 'Cennet hazinelerinden bir hazinedir ve 99 derde devadır.',
        defaultTarget: 100,
        category: 'tesbih',
    },
    {
        id: 'serbest',
        name: 'Serbest Zikir & Evrad',
        arabic: 'ذِكْرُ اللّٰهِ شِفَاءُ الْقُلُوبِ',
        turkish: 'Zikrullâhi şifâu’l-kulûb',
        meaning: 'Allah’ın zikri kalplerin şifasıdır.',
        virtue: 'Kendi belirlediğiniz vird ve zikirler için sınırsız sayaç.',
        defaultTarget: 1000,
        category: 'ozel',
    },
];
