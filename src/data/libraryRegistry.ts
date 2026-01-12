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
            description: 'Çeşitli suallere cevaplar ve İslam hakikatleri.',
            status: 'coming_soon',
            orderIndex: 2,
        },
        {
            workId: 'lemalar',
            libraryId: 'risale_nur',
            title: 'Lem\'alar',
            description: 'Tasavvufi ve imani bahislerin derinlemesine izahı.',
            status: 'coming_soon',
            orderIndex: 3,
        },
        {
            workId: 'sualar',
            libraryId: 'risale_nur',
            title: 'Şualar',
            description: 'Kur\'an\'ın sönmez bir güneş olduğunu ispat eden eser.',
            status: 'coming_soon',
            orderIndex: 4,
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
