/**
 * PrayerQuotesData
 * Curated Ayet, Hadis, and Risale-i Nur vecizeleri mapped specifically to each prayer time.
 * Based on Sözler (9. Söz - Namazın Hikmetleri), Mektubat, and authentic Hadith collections.
 */

export interface PrayerQuote {
    id: string;
    prayerKey: 'imsak' | 'gunes' | 'ogle' | 'ikindi' | 'aksam' | 'yatsi' | 'teheccud';
    prayerName: string;
    title: string;
    ayet: {
        arabic: string;
        meal: string;
        surah: string;
    };
    hadis: {
        text: string;
        source: string;
    };
    risale: {
        text: string;
        source: string;
    };
    hikmet: string;
}

export const PRAYER_QUOTES: Record<string, PrayerQuote> = {
    imsak: {
        id: 'quote-imsak',
        prayerKey: 'imsak',
        prayerName: 'Sabah (Fecir)',
        title: 'Kâinatın Uyanışı & Seher Feyzi',
        ayet: {
            arabic: 'وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِنَ اللَّيْلِ ۚ إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ',
            meal: 'Gündüzün iki tarafında ve gecenin gündüze yakın vakitlerinde namaz kıl. Çünkü iyilikler kötülükleri giderir.',
            surah: 'Hûd Suresi, 114. Âyet',
        },
        hadis: {
            text: 'Kim sabah namazını kılarsa, o Allah’ın himayesindedir.',
            source: 'Müslim, Mesâcid 262',
        },
        risale: {
            text: 'Fecir zamanı, tulûa kadar, evvel-i bahar zamanını, hem insanın rahm-ı mâdere düştüğü ânı, hem semâvat ve arzın altı gün hilkatinden birinci gününü andırır ve hatırlattırır ve onlardaki şuunât-ı İlâhiyeyi ihtar eder.',
            source: 'Sözler • 9. Söz (Sabah Vaktinin Hikmeti)',
        },
        hikmet: 'Sabah vakti, yeniden dirilişin ve kâinatın intibahının ilk tecellisidir; ruhun taze bir şükürle Rabbine yönelme anıdır.',
    },
    gunes: {
        id: 'quote-gunes',
        prayerKey: 'gunes',
        prayerName: 'Güneş (İşrak)',
        title: 'Nurun Zuhuru & Rızık Dağılımı',
        ayet: {
            arabic: 'وَالشَّمْسِ وَضُحَاهَا ۝ وَالْقَمَرِ إِذَا تَلَاهَا',
            meal: 'Güneşe ve onun aydınlığına; onu takip ettiğinde aya andolsun.',
            surah: 'Şems Suresi, 1-2. Âyetler',
        },
        hadis: {
            text: 'Kim sabah namazını cemaatle kılar, sonra güneş doğuncaya kadar oturup Allah’ı zikreder, sonra da iki rekat namaz kılarsa, tam bir hac ve umre sevabı alır.',
            source: 'Tirmizî, Cum’a 59',
        },
        risale: {
            text: 'Güneşin tulûu ânı, kâinat meşherinin açılışını ve envâ-ı mevcudatın rızık ve vazifelerine koşturulmasını ilân eden muazzam bir tasarruf-u İlâhîyi gösterir.',
            source: 'Sözler • 14. Lem’a',
        },
        hikmet: 'Güneşin doğuşu, Cenâb-ı Hakk’ın Nûr isminin âlem sahnesinde tecelli edişini müşahede anıdır.',
    },
    ogle: {
        id: 'quote-ogle',
        prayerKey: 'ogle',
        prayerName: 'Öğle (Zeval)',
        title: 'Kemâl-i Zeval & Dünya Meşgalesinden Sıyrılış',
        ayet: {
            arabic: 'أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَىٰ غَسَقِ اللَّيْلِ وَقُرْآنَ الْفَجْرِ',
            meal: 'Güneşin batıya kaymasından gecenin karanlığına kadar namaz kıl; bir de sabah Kur’an’ını...',
            surah: 'İsrâ Suresi, 78. Âyet',
        },
        hadis: {
            text: 'Öğle vakti, gök kapılarının açıldığı ve salih amellerin Allah’a yükseldiği bir andır.',
            source: 'Tirmizî, Salât 161',
        },
        risale: {
            text: 'Öğle zamanı ise, kemâl-i şebab zamanına ve ömrün ortasına ve yaz mevsiminin kemâline andırır. Ve o zaman, insan ruhunun dünya fırtınasından bir nebze dinlenip dergâh-ı İlâhiyeye el bağlayıp şükür secdesine kapanma ânıdır.',
            source: 'Sözler • 9. Söz (Öğle Vaktinin Hikmeti)',
        },
        hikmet: 'Günün en parlak anında, her kemâlin bir zevale doğru gittiğini hatırlayıp Bâkî olan Zât-ı Zülcelâl’e iltica vaktidir.',
    },
    ikindi: {
        id: 'quote-ikindi',
        prayerKey: 'ikindi',
        prayerName: 'İkindi (Asr)',
        title: 'Ömrün Gurubu & Ahir Zaman Şuuru',
        ayet: {
            arabic: 'حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ وَقُومُوا لِلَّهِ قَانِتِينَ',
            meal: 'Namazlara ve özellikle orta (ikindi) namazına devam edin; saygı ve bağlılıkla Allah’ın huzurunda durun.',
            surah: 'Bakara Suresi, 238. Âyet',
        },
        hadis: {
            text: 'İkindi namazını kaçıran kimsenin hali, sanki ailesi ve malı elinden alınmış kimse gibidir.',
            source: 'Buhârî, Mevâkît 14; Müslim, Mesâcid 200',
        },
        risale: {
            text: 'İkindi vakti, güz mevsim-i hazânına ve ihtiyarlık zamanına ve âhirzaman asrına benzer. Bu vakit, fâni ömrün sür’atle guruba yaklaştığını ve sermaye-i hayatın tükenmekte olduğunu dehşetle ihtar eder.',
            source: 'Sözler • 9. Söz (İkindi Vaktinin Hikmeti)',
        },
        hikmet: 'Batan gün ve solan gölgeler, insanın dünyadaki misafirliğinin kısa bir akşamüstü gibi geçtiğini haykırır.',
    },
    aksam: {
        id: 'quote-aksam',
        prayerKey: 'aksam',
        prayerName: 'Akşam (Gurup)',
        title: 'Fani Âlemin Zevali & Ebediyete İltica',
        ayet: {
            arabic: 'فَسُبْحَانَ اللَّهِ حِينَ تُمْسُونَ وَحِينَ تُصْبِحُونَ',
            meal: 'Akşama girdiğinizde ve sabaha kavuştuğunuzda Allah’ı tesbih edin.',
            surah: 'Rûm Suresi, 17. Âyet',
        },
        hadis: {
            text: 'Akşam namazı girdiğinde melekler yeryüzüne iner; o an duaların reddolunmadığı kıymetli bir vakittir.',
            source: 'Ebû Dâvûd, Salât 22',
        },
        risale: {
            text: 'Mağrib zamanı, pek çok mahlukatın gurubunu ve insanın vefatını ve dünyanın kıyamet kopmasıyla harap olmasını andırır. Ruh, Bâkî-i Hakikî’nin dergâhına sığınarak ‘Yâ Bâkî Ente’l-Bâkî’ feryadıyla secdeye varır.',
            source: 'Sözler • 9. Söz (Akşam Vaktinin Hikmeti)',
        },
        hikmet: 'Güneşin kayboluşuyla perdeler çekilirken, fani mahlukattan yüz çevirip ebedi bir Mâbûd’a kavuşma şevkidir.',
    },
    yatsi: {
        id: 'quote-yatsi',
        prayerKey: 'yatsi',
        prayerName: 'Yatsı (Işâ)',
        title: 'Zulümat Âlemi & Kabir ve Haşir Tefekkürü',
        ayet: {
            arabic: 'وَمِنَ اللَّيْلِ فَاسْجُدْ لَهُ وَسَبِّحْهُ لَيْلًا طَوِيلًا',
            meal: 'Gecenin bir kısmında O’na secde et ve O’nu geceleri uzun uzun tesbih eyle.',
            surah: 'İnsan Suresi, 26. Âyet',
        },
        hadis: {
            text: 'Yatsı namazını cemaatle kılan kimse, gecenin yarısını namazla geçirmiş gibi olur.',
            source: 'Müslim, Mesâcid 260',
        },
        risale: {
            text: 'İşâ vakti, gündüzün eserlerinin büsbütün kaybolmasını ve zulümat âleminin istilâsını ve kabir âlemini hatırlatır. İnsan, Fâtır-ı Zülcelâl’e münâcaat edip Fatiha-i Şerife ile ebedî saadeti niyaz eder.',
            source: 'Sözler • 9. Söz (Yatsı Vaktinin Hikmeti)',
        },
        hikmet: 'Gecenin siyah örtüsü altında, dünya meşgalesini geride bırakarak kabir yalnızlığına karşı namaz nuruyla aydınlanma ânıdır.',
    },
};

export const getQuoteForPrayer = (key: string): PrayerQuote => {
    return PRAYER_QUOTES[key] || PRAYER_QUOTES.imsak;
};
