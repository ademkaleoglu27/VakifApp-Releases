export interface Work {
    workId: string;
    libraryId: string;
    title: string;
    description?: string;
    status: 'ready' | 'coming_soon';
    coverImage?: any; // For local require/assets
    orderIndex: number;
}

export interface Library {
    id: string;
    title: string;
    description: string;
    works: Work[];
}

export const RISALE_LIBRARY: Library = {
    id: 'risale_nur',
    title: 'Risale-i Nur Külliyatı',
    description: 'Bediüzzaman Said Nursi Hazretlerinin Kur\'an tefsiri olan Risale-i Nur Külliyatı.',
    works: [
        {
            workId: 'sozler',
            libraryId: 'risale_nur',
            title: 'Sözler',
            description: 'İman hakikatlerinin akli ve mantıki delillerle ispatı.',
            status: 'ready',
            orderIndex: 1,
            // coverImage: require('@/assets/covers/sozler.png') // Placeholder if needed
        },
        {
            workId: 'mektubat',
            libraryId: 'risale_nur',
            title: 'Mektubat',
            description: 'Mektubat (154 bölüm)',
            status: 'ready',
            orderIndex: 2,
        },
        {
            workId: 'lemalar',
            libraryId: 'risale_nur',
            title: 'Lem\'alar',
            description: 'Tasavvufi ve imani bahislerin derinlemesine izahı.',
            status: 'ready',
            orderIndex: 3,
        },
        {
            workId: 'sualar',
            libraryId: 'risale_nur',
            title: 'Şualar',
            description: 'Kur\'an\'ın sönmez bir güneş olduğunu ispat eden eser.',
            status: 'ready',
            orderIndex: 4,
        },
        {
            workId: 'asayi_musa',
            libraryId: 'risale_nur',
            title: 'Asâ-yı Musa',
            description: 'İman ve İslamiyet hakikatlerinin ispatı.',
            status: 'ready',
            orderIndex: 5,
        },
        {
            workId: 'isaratul_icaz',
            libraryId: 'risale_nur',
            title: 'İşârâtü\'l-İ\'câz',
            description: 'Kur\'an\'ın nazmındaki mucizelikleri izah eden tefsir.',
            status: 'ready',
            orderIndex: 6,
        },
        {
            workId: 'mesnevi_nuriye',
            libraryId: 'risale_nur',
            title: 'Mesnevî-i Nuriye',
            description: 'Arapça Mesnevî\'nin Türkçe tercümesi ve izahı.',
            status: 'ready',
            orderIndex: 7,
        },
        {
            workId: 'sikke_i_tasdik_i_gaybi',
            libraryId: 'risale_nur',
            title: 'Sikke-i Tasdik-i Gaybî',
            description: 'Risale-i Nur\'un makbuliyetine dair manevî işaretler.',
            status: 'ready',
            orderIndex: 8,
        },
        {
            workId: 'barla_lahikasi',
            libraryId: 'risale_nur',
            title: 'Barla Lâhikası',
            description: 'Risale-i Nur\'un ilk telif dönemine ait mektuplar.',
            status: 'ready',
            orderIndex: 9,
        },
        {
            workId: 'kastamonu_lahikasi',
            libraryId: 'risale_nur',
            title: 'Kastamonu Lâhikası',
            description: 'Kastamonu hayatına ait mektuplar ve dersler.',
            status: 'ready',
            orderIndex: 10,
        },
        {
            workId: 'emirdag_lahikasi',
            libraryId: 'risale_nur',
            title: 'Emirdağ Lâhikası',
            description: 'Üstadın Emirdağ hayatında yazdığı mektuplar.',
            status: 'ready',
            orderIndex: 11,
        },
        {
            workId: 'tarihce_i_hayat',
            libraryId: 'risale_nur',
            title: 'Tarihçe-i Hayat',
            description: 'Bediüzzaman Said Nursi\'nin hayatı ve mücadelesi.',
            status: 'ready',
            orderIndex: 12,
        }
    ]
};

export const LIBRARIES = [RISALE_LIBRARY];

export const getLibrary = (id: string) => LIBRARIES.find(l => l.id === id);
export const getWork = (workId: string) => {
    for (const lib of LIBRARIES) {
        const work = lib.works.find(w => w.workId === workId);
        if (work) return work;
    }
    return null;
};
