export interface ArabicLetter {
    id: string;
    arabic: string;
    name: string;
    sound: string;
    transliteration: string;
    type: 'ince' | 'kalin' | 'peltek';
    tip: string;
    forms: {
        isolated: string;
        initial: string;
        medial: string;
        final: string;
    };
    examples?: {
        arabic: string;
        reading: string;
        meaning?: string;
    }[];
}

export interface QuizQuestion {
    id: string;
    question: string;
    arabic?: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export interface Lesson {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    category: 'harfler' | 'harekeler' | 'kaideler' | 'sureler';
    badge: string;
    color: string;
    ruleSummary: string;
    items: {
        id: string;
        arabic: string;
        title: string;
        subtitle?: string;
        reading: string;
        type?: 'ince' | 'kalin' | 'peltek';
        explanation?: string;
        forms?: {
            isolated: string;
            initial: string;
            medial: string;
            final: string;
        };
    }[];
    practiceWords: {
        arabic: string;
        reading: string;
        breakdown?: string;
        meaning?: string;
    }[];
    quiz: QuizQuestion[];
}

export const ARABIC_LETTERS: ArabicLetter[] = [
    {
        id: 'elif',
        arabic: 'ا',
        name: 'Elif',
        sound: 'E / A',
        transliteration: 'A',
        type: 'ince',
        tip: 'Düz bir çizgi gibidir. Boğazın göğse bitişen yerinden yumuşakça çıkar.',
        forms: { isolated: 'ا', initial: 'ا', medial: 'ـا', final: 'ـا' },
        examples: [
            { arabic: 'اَبَ', reading: 'Ebe' },
            { arabic: 'اَمَرَ', reading: 'Emere', meaning: 'Emretti' }
        ]
    },
    {
        id: 'be',
        arabic: 'ب',
        name: 'Bâ / Be',
        sound: 'B',
        transliteration: 'B',
        type: 'ince',
        tip: 'Altında bir nokta vardır. Dudaklar birbirine kuvvetlice bastırılarak çıkarılır.',
        forms: { isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب' },
        examples: [
            { arabic: 'بَلَغَ', reading: 'Belega', meaning: 'Ulaştı' },
            { arabic: 'كَتَبَ', reading: 'Ketebe', meaning: 'Yazdı' }
        ]
    },
    {
        id: 'te',
        arabic: 'ت',
        name: 'Tâ / Te',
        sound: 'T',
        transliteration: 'T',
        type: 'ince',
        tip: 'Üstünde iki nokta vardır (Gülen yüz gibi). Dil ucu üst ön dişlerin diplerine vurularak çıkar.',
        forms: { isolated: 'ت', initial: 'تـ', medial: 'ـتـ', final: 'ـت' },
        examples: [
            { arabic: 'تَرَكَ', reading: 'Tereke', meaning: 'Bıraktı' },
            { arabic: 'فَتَحَ', reading: 'Feteha', meaning: 'Açtı' }
        ]
    },
    {
        id: 'se',
        arabic: 'ث',
        name: 'Se (Peltek)',
        sound: 'S (Peltek)',
        transliteration: 'S',
        type: 'peltek',
        tip: 'Üstünde üç nokta vardır. Dil ucu üst ve alt dişlerin arasından hafifçe dışarı çıkarılarak PELTEK okunur.',
        forms: { isolated: 'ث', initial: 'ثـ', medial: 'ـثـ', final: 'ـث' },
        examples: [
            { arabic: 'ثَبَتَ', reading: 'Sebete', meaning: 'Sabit oldu' },
            { arabic: 'بَعَثَ', reading: 'Be\'ase', meaning: 'Gönderdi' }
        ]
    },
    {
        id: 'cim',
        arabic: 'ج',
        name: 'Cîm / Cim',
        sound: 'C',
        transliteration: 'C',
        type: 'ince',
        tip: 'Karnında bir nokta vardır. Dilin ortası üst damağa kuvvetlice yapıştırılarak çıkar.',
        forms: { isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج' },
        examples: [
            { arabic: 'جَمَعَ', reading: 'Ceme\'a', meaning: 'Topladı' },
            { arabic: 'سَجَدَ', reading: 'Secede', meaning: 'Secde etti' }
        ]
    },
    {
        id: 'ha',
        arabic: 'ح',
        name: 'Hâ (Boğaz Ha\'sı)',
        sound: 'H (Temiz/Boğaz)',
        transliteration: 'H',
        type: 'ince',
        tip: 'Noktasızdır. Boğazın tam ortası hafif sıkılarak tatlı ve ferah bir nefesle çıkar.',
        forms: { isolated: 'ح', initial: 'حـ', medial: 'ـحـ', final: 'ـح' },
        examples: [
            { arabic: 'حَمِدَ', reading: 'Hamide', meaning: 'Övdü' },
            { arabic: 'مَسَحَ', reading: 'Meseha', meaning: 'Sildi' }
        ]
    },
    {
        id: 'hi',
        arabic: 'خ',
        name: 'Hı (Hırıltılı)',
        sound: 'H (Kalın/Hırıltılı)',
        transliteration: 'H',
        type: 'kalin',
        tip: 'Üstünde bir nokta vardır. Boğazın ağza en yakın kısmından hafif hırıltı verilerek çıkar.',
        forms: { isolated: 'خ', initial: 'خـ', medial: 'ـخـ', final: 'ـخ' },
        examples: [
            { arabic: 'خَلَقَ', reading: 'Halaka', meaning: 'Yarattı' },
            { arabic: 'دَخَلَ', reading: 'Dehale', meaning: 'Girdi' }
        ]
    },
    {
        id: 'dal',
        arabic: 'د',
        name: 'Dâl / Dal',
        sound: 'D',
        transliteration: 'D',
        type: 'ince',
        tip: 'Kendinden sonrakine BİRLEŞMEZ. Dil ucu üst diş diplerine değdirilir.',
        forms: { isolated: 'د', initial: 'د', medial: 'ـد', final: 'ـد' },
        examples: [
            { arabic: 'دَرَسَ', reading: 'Derese', meaning: 'Ders çalıştı' },
            { arabic: 'عَبَدَ', reading: '\'Abede', meaning: 'Kulluk etti' }
        ]
    },
    {
        id: 'zel',
        arabic: 'ذ',
        name: 'Zâl (Peltek)',
        sound: 'Z (Peltek)',
        transliteration: 'Z',
        type: 'peltek',
        tip: 'Üstünde bir nokta vardır, sonrakine BİRLEŞMEZ. Dil ucu dişlerin arasından peltekçe çıkarılır.',
        forms: { isolated: 'ذ', initial: 'ذ', medial: 'ـذ', final: 'ـذ' },
        examples: [
            { arabic: 'ذَهَبَ', reading: 'Zehebe', meaning: 'Gitti' },
            { arabic: 'نَذَرَ', reading: 'Nezere', meaning: 'Adadı' }
        ]
    },
    {
        id: 'ra',
        arabic: 'ر',
        name: 'Râ / Ra',
        sound: 'R',
        transliteration: 'R',
        type: 'kalin',
        tip: 'Sonrakine BİRLEŞMEZ. Dil ucu üst damağa hafif vurarak titreşir. Üstün ve ötrede kalın okunur.',
        forms: { isolated: 'ر', initial: 'ر', medial: 'ـر', final: 'ـر' },
        examples: [
            { arabic: 'رَزَقَ', reading: 'Razaka', meaning: 'Rızık verdi' },
            { arabic: 'غَفَرَ', reading: 'Gafera', meaning: 'Bağışladı' }
        ]
    },
    {
        id: 'ze',
        arabic: 'ز',
        name: 'Zâ / Ze (Keskin)',
        sound: 'Z (Keskin)',
        transliteration: 'Z',
        type: 'ince',
        tip: 'Üstünde nokta vardır, sonrakine BİRLEŞMEZ. Arı vızıltısı gibi keskin bir Z sesidir.',
        forms: { isolated: 'ز', initial: 'ز', medial: 'ـز', final: 'ـز' },
        examples: [
            { arabic: 'زَرَعَ', reading: 'Zera\'a', meaning: 'Ekti' },
            { arabic: 'نَزَلَ', reading: 'Nezele', meaning: 'İndi' }
        ]
    },
    {
        id: 'sin',
        arabic: 'س',
        name: 'Sîn / Sin',
        sound: 'S (Keskin)',
        transliteration: 'S',
        type: 'ince',
        tip: 'Üç dişli çanak gibidir. Keskin ve ince S sesidir.',
        forms: { isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس' },
        examples: [
            { arabic: 'سَأَلَ', reading: 'Se\'ele', meaning: 'Sordu' },
            { arabic: 'جَلَسَ', reading: 'Celese', meaning: 'Oturdu' }
        ]
    },
    {
        id: 'sin_noktali',
        arabic: 'ش',
        name: 'Şîn / Şın',
        sound: 'Ş',
        transliteration: 'Ş',
        type: 'ince',
        tip: 'Üzerinde üç nokta vardır. Dil ortası damağa doğru yayılarak Ş sesi çıkar.',
        forms: { isolated: 'ش', initial: 'شـ', medial: 'ـشـ', final: 'ـش' },
        examples: [
            { arabic: 'شَكَرَ', reading: 'Şekera', meaning: 'Şükretti' },
            { arabic: 'عَطَشَ', reading: '\'Ataşa', meaning: 'Susadı' }
        ]
    },
    {
        id: 'sad',
        arabic: 'ص',
        name: 'Sâd / Sad',
        sound: 'S (Dolgun/Kalın)',
        transliteration: 'S',
        type: 'kalin',
        tip: 'Kalın ve tok bir S sesidir. Ağız içi dolgunlaştırılır.',
        forms: { isolated: 'ص', initial: 'صـ', medial: 'ـصـ', final: 'ـص' },
        examples: [
            { arabic: 'صَبَرَ', reading: 'Sabara', meaning: 'Sabretti' },
            { arabic: 'نَصَرَ', reading: 'Nasara', meaning: 'Yardım etti' }
        ]
    },
    {
        id: 'dad',
        arabic: 'ض',
        name: 'Dâd / Dad',
        sound: 'D (Kalın/Özel)',
        transliteration: 'D',
        type: 'kalin',
        tip: 'Üstünde bir nokta vardır. Dilin yan tarafı üst azı dişlerine basılarak tok bir ses çıkar.',
        forms: { isolated: 'ض', initial: 'ضـ', medial: 'ـضـ', final: 'ـض' },
        examples: [
            { arabic: 'ضَرَبَ', reading: 'Darabe', meaning: 'Vurdu' },
            { arabic: 'فَرَضَ', reading: 'Farada', meaning: 'Farz kıldı' }
        ]
    },
    {
        id: 'ti',
        arabic: 'ط',
        name: 'Tâ / Tı',
        sound: 'T (Kalın/Tok)',
        transliteration: 'T',
        type: 'kalin',
        tip: 'Kalın ve tok T sesidir. Dilin ucu ve üstü damağa yapışır.',
        forms: { isolated: 'ط', initial: 'طـ', medial: 'ـطـ', final: 'ـط' },
        examples: [
            { arabic: 'طَلَبَ', reading: 'Talebe', meaning: 'İstedi' },
            { arabic: 'بَسَطَ', reading: 'Besata', meaning: 'Yaydı' }
        ]
    },
    {
        id: 'zi',
        arabic: 'ظ',
        name: 'Zâ / Zı (Kalın Peltek)',
        sound: 'Z (Kalın Peltek)',
        transliteration: 'Z',
        type: 'peltek',
        tip: 'Üstünde bir nokta vardır. Hem kalın hem de peltek telaffuz edilen tok Z sesidir.',
        forms: { isolated: 'ظ', initial: 'ظـ', medial: 'ـظـ', final: 'ـظ' },
        examples: [
            { arabic: 'ظَلَمَ', reading: 'Zaleme', meaning: 'Zulmetti' },
            { arabic: 'حَفِظَ', reading: 'Hafiza', meaning: 'Korudu' }
        ]
    },
    {
        id: 'ayn',
        arabic: 'ع',
        name: '\'Ayn',
        sound: '\'A (Boğaz)',
        transliteration: '\'A',
        type: 'ince',
        tip: 'Boğazın tam ortasından boğaz kasları sıkılarak çıkarılan özel bir harftir.',
        forms: { isolated: 'ع', initial: 'عـ', medial: 'ـعـ', final: 'ـع' },
        examples: [
            { arabic: 'عَلِمَ', reading: '\'Alime', meaning: 'Bildi' },
            { arabic: 'رَفَعَ', reading: 'Refe\'a', meaning: 'Yükseltti' }
        ]
    },
    {
        id: 'gayn',
        arabic: 'غ',
        name: 'Gayn',
        sound: 'G (Boğaz/Gargara)',
        transliteration: 'G',
        type: 'kalin',
        tip: 'Üstünde bir nokta vardır. Boğazın ağza yakın kısmından suyla gargara yapar gibi çıkar.',
        forms: { isolated: 'غ', initial: 'غـ', medial: 'ـغـ', final: 'ـغ' },
        examples: [
            { arabic: 'غَفَرَ', reading: 'Gafera', meaning: 'Bağışladı' },
            { arabic: 'بَلَغَ', reading: 'Belega', meaning: 'Ulaştı' }
        ]
    },
    {
        id: 'fe',
        arabic: 'ف',
        name: 'Fâ / Fe',
        sound: 'F',
        transliteration: 'F',
        type: 'ince',
        tip: 'Üstünde bir nokta vardır. Üst ön dişler alt dudağın içine değdirilerek çıkar.',
        forms: { isolated: 'ف', initial: 'فـ', medial: 'ـفـ', final: 'ـف' },
        examples: [
            { arabic: 'فَتَحَ', reading: 'Feteha', meaning: 'Açtı' },
            { arabic: 'عَرَفَ', reading: '\'Arafe', meaning: 'Tanıdı' }
        ]
    },
    {
        id: 'kaf',
        arabic: 'ق',
        name: 'Kâf / Kaf (Kalın)',
        sound: 'K (Kalın/Gırtlak)',
        transliteration: 'K',
        type: 'kalin',
        tip: 'Üstünde iki nokta vardır. Dil kökü küçük dile doğru bastırılarak tok ve kalın K sesi çıkar.',
        forms: { isolated: 'ق', initial: 'قـ', medial: 'ـقـ', final: 'ـق' },
        examples: [
            { arabic: 'قَرَأَ', reading: 'Kara\'e', meaning: 'Okudu' },
            { arabic: 'سَبَقَ', reading: 'Sebeka', meaning: 'Geçti' }
        ]
    },
    {
        id: 'kef',
        arabic: 'ك',
        name: 'Kef (İnce)',
        sound: 'K (İnce)',
        transliteration: 'K',
        type: 'ince',
        tip: 'İçinde küçük bir işaret (keşide) vardır. İnce ve yumuşak K sesidir.',
        forms: { isolated: 'ك', initial: 'كـ', medial: 'ـكـ', final: 'ـك' },
        examples: [
            { arabic: 'كَتَبَ', reading: 'Ketebe', meaning: 'Yazdı' },
            { arabic: 'تَرَكَ', reading: 'Tereke', meaning: 'Bıraktı' }
        ]
    },
    {
        id: 'lam',
        arabic: 'ل',
        name: 'Lâm / Lam',
        sound: 'L',
        transliteration: 'L',
        type: 'ince',
        tip: 'Oltaya benzer. Dil ucu üst ön dişlerin diş etine basılarak tatlı bir L sesi verir.',
        forms: { isolated: 'ل', initial: 'لـ', medial: 'ـلـ', final: 'ـل' },
        examples: [
            { arabic: 'لَمَسَ', reading: 'Lemese', meaning: 'Dokundu' },
            { arabic: 'جَلَسَ', reading: 'Celese', meaning: 'Oturdu' }
        ]
    },
    {
        id: 'mim',
        arabic: 'م',
        name: 'Mîm / Mim',
        sound: 'M',
        transliteration: 'M',
        type: 'ince',
        tip: 'Dudaklar birbirine yumuşakça kapatılarak genizden gelen sesle çıkar.',
        forms: { isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم' },
        examples: [
            { arabic: 'مَلَكَ', reading: 'Meleke', meaning: 'Sahip oldu' },
            { arabic: 'حَمِدَ', reading: 'Hamide', meaning: 'Övdü' }
        ]
    },
    {
        id: 'nun',
        arabic: 'ن',
        name: 'Nûn / Nun',
        sound: 'N',
        transliteration: 'N',
        type: 'ince',
        tip: 'İçinde tek bir nokta olan çanak gibidir. Dil ucu üst damağa basılarak çıkar.',
        forms: { isolated: 'ن', initial: 'نـ', medial: 'ـنـ', final: 'ـن' },
        examples: [
            { arabic: 'نَزَلَ', reading: 'Nezele', meaning: 'İndi' },
            { arabic: 'سَكَنَ', reading: 'Sekene', meaning: 'Sakinleşti' }
        ]
    },
    {
        id: 'vav',
        arabic: 'و',
        name: 'Vâv / Vav',
        sound: 'V / U / O',
        transliteration: 'V',
        type: 'ince',
        tip: 'Kendinden sonrakine BİRLEŞMEZ. Dudaklar öne doğru yuvarlatılarak çıkar.',
        forms: { isolated: 'و', initial: 'و', medial: 'ـو', final: 'ـو' },
        examples: [
            { arabic: 'وَجَدَ', reading: 'Vecede', meaning: 'Buldu' },
            { arabic: 'وَعَدَ', reading: 'Ve\'ade', meaning: 'Söz verdi' }
        ]
    },
    {
        id: 'he',
        arabic: 'هـ',
        name: 'He (Göğüs He\'si)',
        sound: 'H (Hafif/İnce)',
        transliteration: 'H',
        type: 'ince',
        tip: 'Göğüsten gelen en hafif nefes sesidir.',
        forms: { isolated: 'هـ', initial: 'هـ', medial: 'ـهـ', final: 'ـه' },
        examples: [
            { arabic: 'هَدَى', reading: 'Hedâ', meaning: 'Hidayet etti' },
            { arabic: 'شَهِدَ', reading: 'Şehide', meaning: 'Şahit oldu' }
        ]
    },
    {
        id: 'ye',
        arabic: 'ي',
        name: 'Yâ / Ye',
        sound: 'Y / İ',
        transliteration: 'Y',
        type: 'ince',
        tip: 'Altında iki nokta vardır. Dil ortası üst damağa yükseltilerek yumuşak Y sesi çıkar.',
        forms: { isolated: 'ي', initial: 'يـ', medial: 'ـيـ', final: 'ـي' },
        examples: [
            { arabic: 'يَسَرَ', reading: 'Yesere', meaning: 'Kolaylaştırdı' },
            { arabic: 'بَقِيَ', reading: 'Bakiye', meaning: 'Kaldı' }
        ]
    }
];

export const LESSONS: Lesson[] = [
    {
        id: 1,
        title: 'Ders 1: Harfleri Tanıyalım',
        subtitle: '28 Arapça Temel Harf',
        description: 'Kur\'an-ı Kerim alfabesindeki 28 harfin yalın halleri, kalın/ince özellikleri ve doğru mahreç telaffuzları.',
        icon: 'text-outline',
        category: 'harfler',
        badge: 'Temel Alfabe',
        color: '#064E3B',
        ruleSummary: 'Arapçada 28 harf vardır. Sağdan sola yazılır ve okunur. Harflerin 8 tanesi kalın (A, I, U), diğerleri ince (E, İ, Ü) okunur.',
        items: ARABIC_LETTERS.map(l => ({
            id: l.id,
            arabic: l.arabic,
            title: l.name,
            subtitle: l.tip,
            reading: l.sound,
            type: l.type,
            explanation: l.tip,
            forms: l.forms
        })),
        practiceWords: [
            { arabic: 'ا ب ت ث', reading: 'Elif - Be - Te - Se' },
            { arabic: 'ج ح خ د', reading: 'Cim - Ha - Hı - Dal' },
            { arabic: 'ر ز س ش', reading: 'Ra - Ze - Sin - Şın' },
            { arabic: 'ص ض ط ظ', reading: 'Sad - Dad - Tı - Zı' },
            { arabic: 'ع غ ف ق', reading: 'Ayn - Gayn - Fe - Kaf' },
            { arabic: 'ك ل م ن', reading: 'Kef - Lam - Mim - Nun' },
            { arabic: 'و هـ ي', reading: 'Vav - He - Ye' }
        ],
        quiz: [
            {
                id: 'q1_1',
                question: 'Altında tek nokta olan ve dudaktan çıkan harf hangisidir?',
                options: ['ت (Te)', 'ب (Be)', 'ث (Se)', 'ن (Nun)'],
                correctIndex: 1,
                explanation: 'ب (Be) harfinin altında tek nokta bulunur.'
            },
            {
                id: 'q1_2',
                question: 'Üzerinde üç nokta olan ve peltek okunan harf hangisidir?',
                options: ['ش (Şın)', 'ث (Se)', 'ت (Te)', 'ي (Ye)'],
                correctIndex: 1,
                explanation: 'ث (Se) harfi 3 noktalı ve peltek bir harftir.'
            },
            {
                id: 'q1_3',
                question: 'Aşağıdaki harflerden hangisi KALIN okunan bir harftir?',
                options: ['د (Dal)', 'ك (Kef)', 'ص (Sad)', 'س (Sin)'],
                correctIndex: 2,
                explanation: 'ص (Sad) harfi kalın ve dolgun ses veren bir harftir.'
            }
        ]
    },
    {
        id: 2,
        title: 'Ders 2: Üstün (Fetha َ )',
        subtitle: 'E ve A Sesi ile Okuma',
        description: 'Harfin üstüne konulan eğik çizgi. İnce harfleri "e", kalın harfleri "a" sesiyle okutur.',
        icon: 'chevron-up-circle-outline',
        category: 'harekeler',
        badge: 'E / A Sesi',
        color: '#B91C1C',
        ruleSummary: 'Üstün harekesi ( َ ) harfin üstündedir. İnce harflere "e" (بَ = Be, تَ = Te), kalın harflere "a" (صَ = Sa, خَ = Ha) sesi verir.',
        items: [
            { id: 'u_elif', arabic: 'اَ', title: 'Elif Üstün', reading: 'E / A', type: 'ince' },
            { id: 'u_be', arabic: 'بَ', title: 'Be Üstün', reading: 'Be', type: 'ince' },
            { id: 'u_te', arabic: 'تَ', title: 'Te Üstün', reading: 'Te', type: 'ince' },
            { id: 'u_se', arabic: 'ثَ', title: 'Se Üstün', reading: 'Se (Peltek)', type: 'peltek' },
            { id: 'u_cim', arabic: 'جَ', title: 'Cim Üstün', reading: 'Ce', type: 'ince' },
            { id: 'u_ha', arabic: 'حَ', title: 'Ha Üstün', reading: 'Ha (Tatlı)', type: 'ince' },
            { id: 'u_hi', arabic: 'خَ', title: 'Hı Üstün', reading: 'Ha (Kalın)', type: 'kalin' },
            { id: 'u_dal', arabic: 'دَ', title: 'Dal Üstün', reading: 'De', type: 'ince' },
            { id: 'u_zel', arabic: 'ذَ', title: 'Zel Üstün', reading: 'Ze (Peltek)', type: 'peltek' },
            { id: 'u_ra', arabic: 'رَ', title: 'Ra Üstün', reading: 'Ra (Kalın)', type: 'kalin' },
            { id: 'u_ze', arabic: 'زَ', title: 'Ze Üstün', reading: 'Ze', type: 'ince' },
            { id: 'u_sin', arabic: 'سَ', title: 'Sin Üstün', reading: 'Se', type: 'ince' },
            { id: 'u_sad', arabic: 'صَ', title: 'Sad Üstün', reading: 'Sa (Kalın)', type: 'kalin' },
            { id: 'u_dad', arabic: 'ضَ', title: 'Dad Üstün', reading: 'Da (Kalın)', type: 'kalin' },
            { id: 'u_ti', arabic: 'طَ', title: 'Tı Üstün', reading: 'Ta (Kalın)', type: 'kalin' },
            { id: 'u_zi', arabic: 'ظَ', title: 'Zı Üstün', reading: 'Za (Kalın Peltek)', type: 'peltek' },
            { id: 'u_ayn', arabic: 'عَ', title: 'Ayn Üstün', reading: '\'A', type: 'ince' },
            { id: 'u_gayn', arabic: 'غَ', title: 'Gayn Üstün', reading: 'Ga (Kalın)', type: 'kalin' },
            { id: 'u_kaf', arabic: 'قَ', title: 'Kaf Üstün', reading: 'Ka (Kalın)', type: 'kalin' },
            { id: 'u_kef', arabic: 'كَ', title: 'Kef Üstün', reading: 'Ke', type: 'ince' },
            { id: 'u_lam', arabic: 'لَ', title: 'Lam Üstün', reading: 'Le', type: 'ince' },
            { id: 'u_mim', arabic: 'مَ', title: 'Mim Üstün', reading: 'Me', type: 'ince' },
            { id: 'u_nun', arabic: 'نَ', title: 'Nun Üstün', reading: 'Ne', type: 'ince' },
            { id: 'u_vav', arabic: 'وَ', title: 'Vav Üstün', reading: 'Ve', type: 'ince' },
            { id: 'u_he', arabic: 'هَ', title: 'He Üstün', reading: 'He', type: 'ince' },
            { id: 'u_ye', arabic: 'يَ', title: 'Ye Üstün', reading: 'Ye', type: 'ince' }
        ],
        practiceWords: [
            { arabic: 'كَتَبَ', reading: 'Ke - te - be (Ketebe)', meaning: 'Yazdı' },
            { arabic: 'نَزَلَ', reading: 'Ne - ze - le (Nezele)', meaning: 'İndi' },
            { arabic: 'ذَهَبَ', reading: 'Ze - he - be (Zehebe)', meaning: 'Gitti' },
            { arabic: 'خَلَقَ', reading: 'Ha - la - ka (Halaka)', meaning: 'Yarattı' },
            { arabic: 'صَبَرَ', reading: 'Sa - ba - ra (Sabara)', meaning: 'Sabretti' },
            { arabic: 'فَتَحَ', reading: 'Fe - te - ha (Feteha)', meaning: 'Açtı' }
        ],
        quiz: [
            {
                id: 'q2_1',
                question: '« كَتَبَ » kelimesinin doğru okunuşu hangisidir?',
                options: ['Kitabi', 'Ketebe', 'Kütübü', 'Keteb'],
                correctIndex: 1,
                explanation: 'Tüm harflerin üzerinde üstün (e sesi) olduğu için "Ketebe" şeklinde okunur.'
            },
            {
                id: 'q2_2',
                question: '« صَ » (Sad üstün) harfi nasıl okunur?',
                options: ['Se', 'Sı', 'Sa', 'Sü'],
                correctIndex: 2,
                explanation: 'Sad kalın harf olduğu için üstün ile "Sa" sesiyle okunur.'
            }
        ]
    },
    {
        id: 3,
        title: 'Ders 3: Esre (Kesra ِ )',
        subtitle: 'İ ve I Sesi ile Okuma',
        description: 'Harfin altına konulan eğik çizgi. İnce harfleri "i", kalın harfleri "ı" sesiyle okutur.',
        icon: 'chevron-down-circle-outline',
        category: 'harekeler',
        badge: 'İ / I Sesi',
        color: '#0369A1',
        ruleSummary: 'Esre harekesi ( ِ ) harfin altındadır. İnce harflere "i" (بِ = Bi, تِ = Ti), kalın harflere "ı" (صِ = Sı, طِ = Tı) sesi verir.',
        items: [
            { id: 'e_elif', arabic: 'اِ', title: 'Elif Esre', reading: 'İ', type: 'ince' },
            { id: 'e_be', arabic: 'بِ', title: 'Be Esre', reading: 'Bi', type: 'ince' },
            { id: 'e_te', arabic: 'تِ', title: 'Te Esre', reading: 'Ti', type: 'ince' },
            { id: 'e_cim', arabic: 'جِ', title: 'Cim Esre', reading: 'Ci', type: 'ince' },
            { id: 'e_ha', arabic: 'حِ', title: 'Ha Esre', reading: 'Hi', type: 'ince' },
            { id: 'e_hi', arabic: 'خِ', title: 'Hı Esre', reading: 'Hı (Kalın)', type: 'kalin' },
            { id: 'e_sad', arabic: 'صِ', title: 'Sad Esre', reading: 'Sı (Kalın)', type: 'kalin' },
            { id: 'e_ti', arabic: 'طِ', title: 'Tı Esre', reading: 'Tı (Kalın)', type: 'kalin' },
            { id: 'e_ayn', arabic: 'عِ', title: 'Ayn Esre', reading: '\'I / \'İ', type: 'ince' },
            { id: 'e_kaf', arabic: 'قِ', title: 'Kaf Esre', reading: 'Kı (Kalın)', type: 'kalin' },
            { id: 'e_kef', arabic: 'كِ', title: 'Kef Esre', reading: 'Ki', type: 'ince' },
            { id: 'e_mim', arabic: 'مِ', title: 'Mim Esre', reading: 'Mi', type: 'ince' }
        ],
        practiceWords: [
            { arabic: 'عَلِمَ', reading: '\'A - li - me (\'Alime)', meaning: 'Bildi' },
            { arabic: 'شَرِبَ', reading: 'Şe - ri - be (Şeribe)', meaning: 'İçti' },
            { arabic: 'رَحِمَ', reading: 'Ra - hi - me (Rahime)', meaning: 'Merhamet etti' },
            { arabic: 'سَمِعَ', reading: 'Se - mi - \'a (Semi\'a)', meaning: 'İşitti' },
            { arabic: 'حَمِدَ', reading: 'Ha - mi - de (Hamide)', meaning: 'Şükretti' }
        ],
        quiz: [
            {
                id: 'q3_1',
                question: '« عَلِمَ » kelimesinin doğru okunuşu hangisidir?',
                options: ['Ulema', '\'Alime', '\'İleme', '\'Aleme'],
                correctIndex: 1,
                explanation: 'Ayn üstün (\'A), Lam esre (li), Mim üstün (me) -> \'Alime.'
            }
        ]
    },
    {
        id: 4,
        title: 'Ders 4: Ötre (Damme ُ )',
        subtitle: 'Ü ve U Sesi ile Okuma',
        description: 'Harfin üzerine konulan küçük vav benzeri işaret. İnce harfleri "ü", kalın harfleri "u" sesiyle okutur.',
        icon: 'ellipse-outline',
        category: 'harekeler',
        badge: 'Ü / U Sesi',
        color: '#059669',
        ruleSummary: 'Ötre harekesi ( ُ ) harfin üzerindedir. İnce harflere "ü" (بُ = Bü, كُ = Kü), kalın harflere "u" (صُ = Su, خُ = Hu) sesi verir.',
        items: [
            { id: 'o_elif', arabic: 'اُ', title: 'Elif Ötre', reading: 'Ü / U', type: 'ince' },
            { id: 'o_be', arabic: 'بُ', title: 'Be Ötre', reading: 'Bü', type: 'ince' },
            { id: 'o_te', arabic: 'تُ', title: 'Te Ötre', reading: 'Tü', type: 'ince' },
            { id: 'o_hi', arabic: 'خُ', title: 'Hı Ötre', reading: 'Hu (Kalın)', type: 'kalin' },
            { id: 'o_sad', arabic: 'صُ', title: 'Sad Ötre', reading: 'Su (Kalın)', type: 'kalin' },
            { id: 'o_kef', arabic: 'كُ', title: 'Kef Ötre', reading: 'Kü', type: 'ince' },
            { id: 'o_mim', arabic: 'مُ', title: 'Mim Ötre', reading: 'Mü', type: 'ince' },
            { id: 'o_nun', arabic: 'نُ', title: 'Nun Ötre', reading: 'Nü', type: 'ince' }
        ],
        practiceWords: [
            { arabic: 'رُسُلُ', reading: 'Ru - su - lü (Rusulü)', meaning: 'Peygamberler' },
            { arabic: 'كُتُبُ', reading: 'Kü - tü - bü (Kütübü)', meaning: 'Kitaplar' },
            { arabic: 'خُلِقَ', reading: 'Hu - li - ka (Hulika)', meaning: 'Yaratıldı' },
            { arabic: 'ذُكِرَ', reading: 'Zü - ki - ra (Zükira)', meaning: 'Anıldı' },
            { arabic: 'حُمِدَ', reading: 'Hu - mi - de (Humide)', meaning: 'Övüldü' }
        ],
        quiz: [
            {
                id: 'q4_1',
                question: '« كُتُبُ » kelimesinin okunuşu hangisidir?',
                options: ['Ketebe', 'Kütibü', 'Kütübü', 'Kütübi'],
                correctIndex: 2,
                explanation: 'Kef ötre (Kü), Te ötre (tü), Be ötre (bü) -> Kütübü.'
            }
        ]
    },
    {
        id: 5,
        title: 'Ders 5: Harflerin Birleşmesi',
        subtitle: 'Başta, Ortada ve Sonda Yazılışlar',
        description: 'Arapçada harfler kelime içinde birbirine bağlanır. Başta, ortada ve sonda kuyrukları kısalır.',
        icon: 'link-outline',
        category: 'kaideler',
        badge: 'Yazılış Şekilleri',
        color: '#D97706',
        ruleSummary: 'ÖNEMLİ KURAL: 6 harf kendinden SONRAKİ harfle asla birleşmez: Elif (ا), Dal (د), Zel (ذ), Ra (ر), Ze (ز), Vav (و). Diğer tüm harfler birbirine bağlanır.',
        items: [
            { id: 'form_be', arabic: 'بـ ـبـ ـب', title: 'Be Formları', reading: 'Başta (بـ) - Ortada (ـبـ) - Sonda (ـب)', forms: { isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب' } },
            { id: 'form_cim', arabic: 'جـ ـجـ ـج', title: 'Cim Formları', reading: 'Başta (جـ) - Ortada (ـجـ) - Sonda (ـج)', forms: { isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج' } },
            { id: 'form_sin', arabic: 'سـ ـسـ ـس', title: 'Sin Formları', reading: 'Başta (سـ) - Ortada (ـسـ) - Sonda (ـس)', forms: { isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس' } },
            { id: 'form_ayn', arabic: 'عـ ـعـ ـع', title: 'Ayn Formları', reading: 'Başta (عـ) - Ortada (ـعـ) - Sonda (ـع)', forms: { isolated: 'ع', initial: 'عـ', medial: 'ـعـ', final: 'ـع' } },
            { id: 'form_kef', arabic: 'كـ ـكـ ـك', title: 'Kef Formları', reading: 'Başta (كـ) - Ortada (ـكـ) - Sonda (ـك)', forms: { isolated: 'ك', initial: 'كـ', medial: 'ـكـ', final: 'ـك' } },
            { id: 'form_mim', arabic: 'مـ ـمـ ـم', title: 'Mim Formları', reading: 'Başta (مـ) - Ortada (ـمـ) - Sonda (ـم)', forms: { isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم' } },
            { id: 'form_he', arabic: 'هـ ـهـ ـه', title: 'He Formları', reading: 'Başta (هـ) - Ortada (ـهـ) - Sonda (ـه)', forms: { isolated: 'هـ', initial: 'هـ', medial: 'ـهـ', final: 'ـه' } },
            { id: 'form_ye', arabic: 'يـ ـيـ ـي', title: 'Ye Formları', reading: 'Başta (يـ) - Ortada (ـيـ) - Sonda (ـي)', forms: { isolated: 'ي', initial: 'يـ', medial: 'ـيـ', final: 'ـي' } }
        ],
        practiceWords: [
            { arabic: 'بِسْمِ', reading: 'Bis - mi (Bismi)', breakdown: 'Be + Sin + Mim' },
            { arabic: 'نَعْبُدُ', reading: 'Na\' - bü - dü (Na\'büdü)', breakdown: 'Nun + Ayn + Be + Dal' },
            { arabic: 'مَلِكِ', reading: 'Me - li - ki (Meliki)', breakdown: 'Mim + Lam + Kef' },
            { arabic: 'يَوْمِ', reading: 'Yev - mi (Yevmi)', breakdown: 'Ye + Vav + Mim' }
        ],
        quiz: [
            {
                id: 'q5_1',
                question: 'Aşağıdaki harflerden hangisi kendinden SONRAKİ harfle BİRLEŞMEZ?',
                options: ['ب (Be)', 'ر (Ra)', 'س (Sin)', 'م (Mim)'],
                correctIndex: 1,
                explanation: 'Ra (ر), Elif (ا), Dal (د), Zel (ذ), Ze (ز) ve Vav (و) harfleri kendinden sonrakine birleşmez.'
            }
        ]
    },
    {
        id: 6,
        title: 'Ders 6: Cezm (Sükun ْ )',
        subtitle: 'Harfi Durdurma / Tutma',
        description: 'Harfin üzerine konulan küçük yuvarlak işaret. Harfi harekesiz olarak önceki harfe bağlayıp durdurur.',
        icon: 'stop-circle-outline',
        category: 'kaideler',
        badge: 'Harfi Durdur',
        color: '#4F46E5',
        ruleSummary: 'Cezm ( ْ ) harfi durdurur ve heceyi kilitler. Örneğin: اَ + بْ = اَبْ (Eb), مِ + نْ = مِنْ (Min).',
        items: [
            { id: 'c_eb', arabic: 'اَبْ', title: 'Eb', reading: 'Eb' },
            { id: 'c_et', arabic: 'اَتْ', title: 'Et', reading: 'Et' },
            { id: 'c_min', arabic: 'مِنْ', title: 'Min', reading: 'Min' },
            { id: 'c_kul', arabic: 'قُلْ', title: 'Kul', reading: 'Kul' },
            { id: 'c_kem', arabic: 'كَمْ', title: 'Kem', reading: 'Kem' },
            { id: 'c_hel', arabic: 'هَلْ', title: 'Hel', reading: 'Hel' }
        ],
        practiceWords: [
            { arabic: 'اَلْحَمْدُ', reading: 'El - ham - dü (Elhamdü)', meaning: 'Hamd olsun' },
            { arabic: 'يَعْلَمُ', reading: 'Ya\' - le - mü (Ya\'lemü)', meaning: 'Bilir' },
            { arabic: 'اَنْعَمْتَ', reading: 'En - \'am - te (En\'amte)', meaning: 'Nimet verdin' },
            { arabic: 'مَغْضُوبِ', reading: 'Mag - dû - bi (Magdûbi)', meaning: 'Gazaba uğrayan' }
        ],
        quiz: [
            {
                id: 'q6_1',
                question: '« اَلْحَمْدُ » kelimesindeki cezm harfleri hangileridir?',
                options: ['Elif ve Dal', 'Lam ve Mim', 'Ha ve Dal', 'Sadece Lam'],
                correctIndex: 1,
                explanation: 'Lam (لْ) ve Mim (مْ) üzerinde cezm vardır: El - ham - dü.'
            }
        ]
    },
    {
        id: 7,
        title: 'Ders 7: Şedde ( ّ )',
        subtitle: 'Harfi İki Kere Okutma',
        description: 'Harfin üzerine konulan "w" benzeri işaret. Harfi önce cezm ile tutup ardından harekesiyle birlikte iki kere okutur.',
        icon: 'repeat-outline',
        category: 'kaideler',
        badge: 'Harfi İkile',
        color: '#7C3AED',
        ruleSummary: 'Şedde ( ّ ) harfi çift okutur. İlk harf sakin (cezimli), ikinci harf harekeli gibi okunur. Örneğin: اِنَّ = İn - ne, رَبَّ = Rab - be.',
        items: [
            { id: 's_inne', arabic: 'اِنَّ', title: 'İnne', reading: 'İn - ne' },
            { id: 's_rabbe', arabic: 'رَبَّ', title: 'Rabbe', reading: 'Rab - be' },
            { id: 's_kulle', arabic: 'كُلَّ', title: 'Külle', reading: 'Kül - le' },
            { id: 's_summe', arabic: 'ثُمَّ', title: 'Sümme', reading: 'Süm - me' },
            { id: 's_hakka', arabic: 'حَقَّ', title: 'Hakka', reading: 'Hak - ka' },
            { id: 's_allah', arabic: 'اَللّٰهُ', title: 'Allahu', reading: 'Al - lâ - hu' }
        ],
        practiceWords: [
            { arabic: 'رَبِّ الْعَالَمِينَ', reading: 'Rab - bil - \'âlemîn', meaning: 'Alemlerin Rabbi' },
            { arabic: 'اِيَّاكَ', reading: 'İy - yâ - ke (İyyâke)', meaning: 'Yalnız Sana' },
            { arabic: 'الرَّحْمٰنِ', reading: 'Er - Rah - mâ - ni (Er-Rahmân)', meaning: 'Çok Merhametli' }
        ],
        quiz: [
            {
                id: 'q7_1',
                question: '« اِنَّ » kelimesindeki şeddeli harf hangisidir ve nasıl okunur?',
                options: ['Elif harfidir, E-e okunur', 'Nun harfidir, İn-ne okunur', 'Te harfidir, İt-te okunur', 'Tek N ile İne okunur'],
                correctIndex: 1,
                explanation: 'Nun harfinde şedde vardır ve "İn-ne" şeklinde ikilenerek okunur.'
            }
        ]
    },
    {
        id: 8,
        title: 'Ders 8: Tenvinler ( ً ٍ ٌ )',
        subtitle: 'İki Üstün, İki Esre, İki Ötre',
        description: 'Kelimenin sonuna "N" sesi ekleyen çift harekelerdir (-en/-an, -in/-ın, -ün/-un).',
        icon: 'copy-outline',
        category: 'kaideler',
        badge: 'Tenvin (-en -in -ün)',
        color: '#BE185D',
        ruleSummary: 'İki Üstün ( ً ) = -en / -an | İki Esre ( ٍ ) = -in / -ın | İki Ötre ( ٌ ) = -ün / -un sesi verir. Sadece kelime sonlarında bulunur.',
        items: [
            { id: 't_en', arabic: 'كِتَابًا', title: 'İki Üstün', reading: 'Kitâben (-en sesi)' },
            { id: 't_in', arabic: 'يَوْمٍ', title: 'İki Esre', reading: 'Yevmin (-in sesi)' },
            { id: 't_un', arabic: 'عَلِيمٌ', title: 'İki Ötre', reading: '\'Alîmün (-ün sesi)' },
            { id: 't_gafur', arabic: 'غَفُورٌ', title: 'Gafûrun', reading: 'Ga - fû - run' },
            { id: 't_rahmet', arabic: 'رَحْمَةً', title: 'Rahmeten', reading: 'Rah - me - ten' }
        ],
        practiceWords: [
            { arabic: 'سَمِيعٌ عَلِيمٌ', reading: 'Semî\'un \'Alîmün', meaning: 'Hakkıyla işiten ve bilendir' },
            { arabic: 'غَفُورٌ رَحِيمٌ', reading: 'Gafûrun Rahîmün', meaning: 'Bağışlayan ve merhamet edendir' },
            { arabic: 'رِزْقًا حَسَنًا', reading: 'Rizkan Hasenen', meaning: 'Güzel bir rızık' }
        ],
        quiz: [
            {
                id: 'q8_1',
                question: '« عَلِيمٌ » kelimesinin sonundaki iki ötre nasıl okunur?',
                options: ['Alime', 'Alimi', 'Alîmün', 'Alima'],
                correctIndex: 2,
                explanation: 'İki ötre ( ٌ ) kelime sonuna "-ün / -un" sesi verir -> Alîmün.'
            }
        ]
    },
    {
        id: 9,
        title: 'Ders 9: Med Harfleri & Çekerler',
        subtitle: 'Uzatma Harfleri ( ا  و  ي )',
        description: 'Harekesiz Elif, Vav ve Ye harfleri kendinden önceki harfi bir elif (yaklaşık 1 parmak kaldırımı) miktarı uzatır.',
        icon: 'resize-outline',
        category: 'kaideler',
        badge: 'Uzatma (Med)',
        color: '#0891B2',
        ruleSummary: 'Üstünden sonra harekeli olmayan Elif ( ا ), Esreden sonra Ye ( ي ), Ötreden sonra Vav ( و ) gelirse önceki harf 1 elif miktarı UZATILIR.',
        items: [
            { id: 'm_elif', arabic: 'قَالَ', title: 'Elif ile Uzatma', reading: 'Kââ - le (Kâle)' },
            { id: 'm_vav', arabic: 'يَقُولُ', title: 'Vav ile Uzatma', reading: 'Ye - kûû - lü (Yekûlü)' },
            { id: 'm_ye', arabic: 'قِيلَ', title: 'Ye ile Uzatma', reading: 'Kîî - le (Kîle)' },
            { id: 'm_nuh', arabic: 'نُوحِيهَا', title: 'Üç Med Birlikte', reading: 'Nû - hî - hâ' }
        ],
        practiceWords: [
            { arabic: 'اَلرَّحْمٰنِ الرَّحِيمِ', reading: 'Er-Rahmâni\'r-Rahîm', meaning: 'Rahman ve Rahim' },
            { arabic: 'مَالِكِ يَوْمِ الدِّينِ', reading: 'Mâliki yevmi\'d-dîn', meaning: 'Din gününün sahibi' },
            { arabic: 'اَلَّذِينَ يُؤْمِنُونَ', reading: 'Ellezîne yü\'minûn', meaning: 'O kimseler ki iman ederler' }
        ],
        quiz: [
            {
                id: 'q9_1',
                question: 'Aşağıdaki kelimelerden hangisinde "Vav" harfi uzatma (med) görevi yapmaktadır?',
                options: ['وَجَدَ', 'يَقُولُ', 'وَلَدَ', 'وَصَلَ'],
                correctIndex: 1,
                explanation: '« يَقُولُ » kelimesinde ötreli Kaf harfinden sonra gelen sakin Vav uzatma yapar (Yekûlü).'
            }
        ]
    },
    {
        id: 10,
        title: 'Ders 10: Kur\'an\'a Geçiş & İlk Sureler',
        subtitle: 'Fatiha, İhlas, Felak, Nas',
        description: 'Tüm öğrendiklerinizi birleştirerek ilk sureleri kelime kelime ve ayet ayet akıcı şekilde okuma.',
        icon: 'book-outline',
        category: 'sureler',
        badge: 'Tebrikler! Kur\'an\'dasınız',
        color: '#064E3B',
        ruleSummary: 'Bütün kuralları tamamladınız! Artık durak işaretlerinde durmayı (Vakıf) ve ayetleri tane tane tertil ile okumayı uygulayabilirsiniz.',
        items: [
            {
                id: 's_fatiha',
                arabic: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ ﴿١﴾ اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ ﴿٢﴾ الرَّحْمٰنِ الرَّحِيمِ ﴿٣﴾ مَالِكِ يَوْمِ الدِّينِ ﴿٤﴾ اِيَّاكَ نَعْبُدُ وَاِيَّاكَ نَسْتَعِينُ ﴿٥﴾ اِهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ﴿٦﴾ صِرَاطَ الَّذِينَ اَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ ﴿٧﴾',
                title: 'Fâtiha Suresi',
                reading: 'Bismillâhirrahmânirrahîm. Elhamdü lillâhi rabbil\'âlemîn. Errahmânirrahîm. Mâliki yevmiddîn. İyyâke na\'büdü ve iyyâke neste\'în. İhdinas-sırâtal müstakîm. Sırâtallezîne en\'amte \'aleyhim gayril magdûbi \'aleyhim veled-dâllîn.'
            },
            {
                id: 's_ihlas',
                arabic: 'قُلْ هُوَ اللّٰهُ اَحَدٌ ﴿١﴾ اَللّٰهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُنْ لَهُ كُفُوًا اَحَدٌ ﴿٤﴾',
                title: 'İhlâs Suresi',
                reading: 'Kul hüvallâhü ehad. Allâhüs-samed. Lem yelid ve lem yûled. Ve lem yekün lehû küfüven ehad.'
            },
            {
                id: 's_felak',
                arabic: 'قُلْ اَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ مِنْ شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِنْ شَرِّ غَاسِقٍ اِذَا وَقَبَ ﴿٣﴾ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾ وَمِنْ شَرِّ حَاسِدٍ اِذَا حَسَدَ ﴿٥﴾',
                title: 'Felak Suresi',
                reading: 'Kul e\'ûzü bi-rabbil felak. Min şerri mâ halak. Ve min şerri gâsikın izâ vekab. Ve min şerrin-neffâsâti fil \'ukad. Ve min şerri hâsidin izâ hased.'
            },
            {
                id: 's_nas',
                arabic: 'قُلْ اَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾ مَلِكِ النَّاسِ ﴿٢﴾ اِلٰهِ النَّاسِ ﴿٣﴾ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾ اَلَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾ مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾',
                title: 'Nâs Suresi',
                reading: 'Kul e\'ûzü bi-rabbin-nâs. Melikin-nâs. İlâhin-nâs. Min şerril vesvâsil hannâs. Ellezî yüvesvisü fî sudûrin-nâs. Minel cinneti ven-nâs.'
            }
        ],
        practiceWords: [
            { arabic: 'بِسْمِ اللّٰهِ', reading: 'Bismillâh', meaning: 'Allah\'ın adıyla' },
            { arabic: 'اَلْحَمْدُ لِلّٰهِ', reading: 'Elhamdülillâh', meaning: 'Hamd Allah\'a mahsustur' },
            { arabic: 'اَللّٰهُ اَكْبَرُ', reading: 'Allâhu Ekber', meaning: 'Allah en büyüktür' },
            { arabic: 'سُبْحَانَ اللّٰهِ', reading: 'Sübhânallâh', meaning: 'Allah her türlü noksanlıktan münezzehtir' }
        ],
        quiz: [
            {
                id: 'q10_1',
                question: '« قُلْ هُوَ اللّٰهُ اَحَدٌ » ayetinin anlamı nedir?',
                options: ['De ki: O Allah tektir.', 'Hamd alemlerin Rabbine mahsustur.', 'De ki: Sabahın Rabbine sığınırım.', 'Yalnız Sana kulluk ederiz.'],
                correctIndex: 0,
                explanation: 'İhlas Suresi 1. ayet: "De ki: O Allah tektir."'
            }
        ]
    }
];
