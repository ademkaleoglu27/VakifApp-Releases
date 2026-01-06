export interface TesbihatTrack {
    id: string;
    title: string;
    filename: string; // Changed from source: require(...) to filename string
}

export interface TesbihatTime {
    id: string; // sabah, ogle, ikindi, aksam, yatsi
    title: string;
    tracks: TesbihatTrack[];
    color: string;
    pdfSource?: any; // Keeping PDF as require for now, or change if needed later
}

export const TESBIHAT_DATA: TesbihatTime[] = [
    {
        id: 'sabah',
        title: 'Sabah Namazı',
        color: '#FDBA74', // Orange-300
        tracks: [
            {
                id: 'sabah_ecirna',
                title: 'Ecirna Duası',
                filename: 'sabah_ecirna.mp3',
            },
            {
                id: 'sabah_ismi_azam',
                title: 'Tercüman-ı İsmi Azam',
                filename: 'sabah_ismi_azam.mp3',
            },
            {
                id: 'sabah_asir',
                title: 'Aşir (Haşr Suresi)',
                filename: 'sabah_asir.mp3',
            },
        ],
    },
    {
        id: 'ogle',
        title: 'Öğle Namazı',
        color: '#FCD34D', // Amber-300
        tracks: [
            {
                id: 'ogle_tesbihat',
                title: 'Öğle Tesbihatı (Ana Bölüm)',
                filename: 'ogle_tesbihat.mp3',
            },
            {
                id: 'ogle_ismi_azam',
                title: 'İsmi Azam Duası',
                filename: 'ogle_ismi_azam.mp3',
            },
            {
                id: 'ogle_asir',
                title: 'Aşir (Fetih Suresi)',
                filename: 'ogle_asir.mp3',
            },
        ],
    },
    {
        id: 'ikindi',
        title: 'İkindi Namazı',
        color: '#FCA5A5', // Red-300
        tracks: [
            {
                id: 'ikindi_tesbihat',
                title: 'İkindi Tesbihatı (Ana Bölüm)',
                filename: 'ikindi_tesbihat.mp3',
            },
            {
                id: 'ikindi_ismi_azam',
                title: 'Tercüman-ı İsmi Azam',
                filename: 'ikindi_ismi_azam.mp3',
            },
            {
                id: 'ikindi_asir',
                title: 'Aşir (Nebe Suresi)',
                filename: 'ikindi_asir.mp3',
            },
        ],
    },
    {
        id: 'aksam',
        title: 'Akşam Namazı',
        color: '#818CF8', // Indigo-400
        tracks: [
            {
                id: 'aksam_tesbihat',
                title: 'Akşam Tesbihatı (Ana Bölüm)',
                filename: 'aksam_tesbihat.mp3',
            },
            {
                id: 'aksam_ecirna',
                title: 'Ecirna Duası',
                filename: 'aksam_ecirna.mp3',
            },
            {
                id: 'aksam_ismi_azam',
                title: 'İsmi Azam Duası',
                filename: 'aksam_ismi_azam.mp3',
            },
            {
                id: 'aksam_asir',
                title: 'Aşir (Haşr Suresi)',
                filename: 'aksam_asir.mp3',
            },
        ],
    },
    {
        id: 'yatsi',
        title: 'Yatsı Namazı',
        color: '#6366F1', // Indigo-500
        tracks: [
            {
                id: 'yatsi_tesbihat',
                title: 'Yatsı Tesbihatı (Ana Bölüm)',
                filename: 'yatsi_tesbihat.mp3',
            },
            {
                id: 'yatsi_ismi_azam',
                title: 'İsmi Azam Duası',
                filename: 'yatsi_ismi_azam.mp3',
            },
            {
                id: 'yatsi_asir',
                title: 'Aşir (Bakara Suresi)',
                filename: 'yatsi_asir.mp3',
            },
        ],
    },
];
