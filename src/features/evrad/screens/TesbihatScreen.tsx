import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- TYPES ---
interface TesbihatContent {
    arabic?: string;
    latin?: string;
    instruction?: string;
    count?: number;
    type?: string;
    text?: string;
}

interface TesbihatSection {
    id: string;
    title: string;
    instruction?: string;
    repeat?: number;
    type?: string;
    content: TesbihatContent[];
}

interface TesbihatData {
    title: string;
    sections: TesbihatSection[];
}

interface PrayerItem {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    file: any;
    latinFile: any;
}

// --- CONFIGURATION ---
const PRAYERS: PrayerItem[] = [
    {
        id: 'sabah',
        title: 'Sabah Namazı',
        subtitle: 'Tesbihatı',
        icon: 'sunny-outline',
        file: require('../../../../assets/books/tesbihat_sabah.json'),
        latinFile: require('../../../../assets/books/tesbihat_sabah_latin.json'),
    },
    {
        id: 'ogle',
        title: 'Öğle Namazı',
        subtitle: 'Tesbihatı',
        icon: 'partly-sunny-outline',
        file: require('../../../../assets/books/tesbihat_ogle.json'),
        latinFile: require('../../../../assets/books/tesbihat_ogle_latin.json'),
    },
    {
        id: 'ikindi',
        title: 'İkindi Namazı',
        subtitle: 'Tesbihatı',
        icon: 'sunny',
        file: require('../../../../assets/books/tesbihat_ikindi.json'),
        latinFile: require('../../../../assets/books/tesbihat_ikindi_latin.json'),
    },
    {
        id: 'aksam',
        title: 'Akşam Namazı',
        subtitle: 'Tesbihatı',
        icon: 'moon-outline',
        file: require('../../../../assets/books/tesbihat_aksam.json'),
        latinFile: require('../../../../assets/books/tesbihat_aksam_latin.json'),
    },
    {
        id: 'yatsi',
        title: 'Yatsı Namazı',
        subtitle: 'Tesbihatı',
        icon: 'moon',
        file: require('../../../../assets/books/tesbihat_yatsi.json'),
        latinFile: require('../../../../assets/books/tesbihat_yatsi_latin.json'),
    }
];

const FONT_OPTIONS = [
    { key: 'ScheherazadeNew', label: 'Scheherazade' },
    { key: 'KFGQPC_HAFS', label: 'Mushaf' },
    { key: 'Amiri', label: 'Amiri' },
];

const COLOR_OPTIONS = [
    { key: '#B3261E', label: 'Risale' },
    { key: '#1A237E', label: 'Mavi' },
    { key: '#1B1B1B', label: 'Siyah' },
    { key: '#1B5E20', label: 'Yeşil' },
];

const STORAGE_KEY = '@tesbihat_settings';

// --- COMPONENTS ---

const PrayerCard = ({ item, onPress }: { item: PrayerItem; onPress: () => void }) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.cardIconContainer}>
            <Ionicons name={item.icon as any} size={28} color={theme.colors.primary} />
        </View>
        <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </TouchableOpacity>
);

const DetailView = ({ prayer, onBack }: { prayer: PrayerItem; onBack: () => void }) => {
    const [showSettings, setShowSettings] = useState(false);
    const [showLatin, setShowLatin] = useState(false);

    // Settings State
    const [fontSize, setFontSizeState] = useState(32);
    const [fontFamily, setFontFamilyState] = useState('ScheherazadeNew');
    const [fontColor, setFontColorState] = useState('#B3261E');

    // Load Settings
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(json => {
            if (json) {
                try {
                    const s = JSON.parse(json);
                    if (s.fontSize) setFontSizeState(s.fontSize);
                    if (s.fontFamily) setFontFamilyState(s.fontFamily);
                    if (s.fontColor) setFontColorState(s.fontColor);
                    if (s.showLatin !== undefined) setShowLatin(s.showLatin);
                } catch { }
            }
        }).catch(() => { });
    }, []);

    const persist = (patch: Record<string, any>) => {
        const merged = { fontSize, fontFamily, fontColor, showLatin, ...patch };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => { });
    };

    const changeFontSize = (delta: number) => {
        const next = Math.max(18, Math.min(60, fontSize + delta));
        setFontSizeState(next);
        persist({ fontSize: next });
    };

    const changeFontFamily = (f: string) => {
        setFontFamilyState(f);
        persist({ fontFamily: f });
    };

    const changeFontColor = (c: string) => {
        setFontColorState(c);
        persist({ fontColor: c });
    };

    const toggleLatin = (val: boolean) => {
        setShowLatin(val);
        persist({ showLatin: val });
    };

    // Choose data source based on toggle
    const data: TesbihatData = showLatin ? prayer.latinFile : prayer.file;

    return (
        <SafeAreaView style={styles.detailContainer} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{prayer.title}</Text>
                    <Text style={styles.headerSubtitle}>
                        {showLatin ? 'TÜRKÇE OKUNUŞ' : 'TESBİHAT'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => setShowSettings(!showSettings)}
                >
                    <Ionicons name={showSettings ? 'close' : 'settings-outline'} size={22} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Settings Panel */}
            {showSettings && (
                <View style={styles.settingsPanel}>
                    {/* Türkçe Okunuş Toggle */}
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Türkçe Okunuş</Text>
                        <Switch
                            value={showLatin}
                            onValueChange={toggleLatin}
                            trackColor={{ false: '#e2e8f0', true: '#8B4513' }}
                            thumbColor="white"
                        />
                    </View>

                    {/* Font Size */}
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Yazı Boyutu</Text>
                        <View style={styles.fontSizeControls}>
                            <TouchableOpacity style={styles.fontSizeBtn} onPress={() => changeFontSize(-2)}>
                                <Text style={styles.fontSizeBtnText}>A−</Text>
                            </TouchableOpacity>
                            <Text style={styles.fontSizeValue}>{fontSize}</Text>
                            <TouchableOpacity style={styles.fontSizeBtn} onPress={() => changeFontSize(2)}>
                                <Text style={styles.fontSizeBtnText}>A+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Font Family (only for Arabic mode) */}
                    {!showLatin && (
                        <>
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>Yazı Tipi</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                {FONT_OPTIONS.map(f => {
                                    const active = f.key === fontFamily;
                                    return (
                                        <TouchableOpacity
                                            key={f.key}
                                            style={[styles.chip, active && styles.chipActive]}
                                            onPress={() => changeFontFamily(f.key)}
                                        >
                                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                                {f.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </>
                    )}

                    {/* Font Color */}
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Renk</Text>
                        <View style={styles.colorRow}>
                            {COLOR_OPTIONS.map(c => (
                                <TouchableOpacity
                                    key={c.key}
                                    onPress={() => changeFontColor(c.key)}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: c.key },
                                        c.key === fontColor && styles.colorCircleActive,
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                </View>
            )}

            {/* Content */}
            <ScrollView contentContainerStyle={styles.contentContainer}>
                {data.sections.map((section, index) => (
                    <View key={index} style={styles.sectionContainer}>
                        {/* Section Header */}
                        {section.title ? (
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                                {section.repeat && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{section.repeat} Defa</Text>
                                    </View>
                                )}
                            </View>
                        ) : null}

                        {section.instruction && (
                            <Text style={styles.mainInstruction}>{section.instruction}</Text>
                        )}

                        {(section.title || section.instruction) && <View style={styles.divider} />}

                        {/* Content Items */}
                        {section.content.map((item, idx) => (
                            <View key={idx} style={styles.contentBlock}>
                                {item.text && !item.arabic && !item.latin && (
                                    <Text style={styles.mainInstruction}>{item.text}</Text>
                                )}

                                {item.instruction && (
                                    <Text style={styles.itemInstruction}>{item.instruction}</Text>
                                )}

                                {item.arabic && (
                                    <Text
                                        style={[
                                            styles.arabicText,
                                            {
                                                fontSize: fontSize,
                                                lineHeight: fontSize * 1.8,
                                                fontFamily: fontFamily,
                                                color: fontColor,
                                            },
                                        ]}
                                    >
                                        {item.arabic}
                                    </Text>
                                )}

                                {item.latin && (
                                    <Text
                                        style={[
                                            styles.latinText,
                                            showLatin
                                                ? {
                                                    fontSize: Math.max(14, fontSize * 0.5),
                                                    lineHeight: Math.max(22, fontSize * 0.8),
                                                    color: fontColor,
                                                }
                                                : {},
                                        ]}
                                    >
                                        {item.latin}
                                    </Text>
                                )}

                                {item.count && (
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countText}>{item.count}x</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                ))}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

// --- MAIN SCREEN ---

export const TesbihatScreen = () => {
    const navigation = useNavigation();
    const [selectedPrayer, setSelectedPrayer] = useState<PrayerItem | null>(null);

    if (selectedPrayer) {
        return <DetailView prayer={selectedPrayer} onBack={() => setSelectedPrayer(null)} />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>TESBİHAT</Text>
                    <Text style={styles.headerSubtitle}>ÖZLÜ NAMAZ TESBİHATI</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.listContainer}>
                {PRAYERS.map((prayer) => (
                    <PrayerCard
                        key={prayer.id}
                        item={prayer}
                        onPress={() => setSelectedPrayer(prayer)}
                    />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

// --- STYLES ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    detailContainer: {
        flex: 1,
        backgroundColor: '#efe7d1',
    },
    header: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingsButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
        letterSpacing: 2,
    },
    // Settings Panel
    settingsPanel: {
        backgroundColor: '#FFF9E6',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E8D5A3',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    settingLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#5D4037',
    },
    fontSizeControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    fontSizeBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(139,69,19,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fontSizeBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8B4513',
    },
    fontSizeValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8B7355',
        minWidth: 36,
        textAlign: 'center',
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(139,69,19,0.08)',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: '#8B4513',
        borderColor: '#8B4513',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#5D4037',
    },
    chipTextActive: {
        color: '#FFF',
        fontWeight: '700',
    },
    colorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    colorCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorCircleActive: {
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    // List
    listContainer: {
        padding: 20,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: theme.colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    // Detail Content
    contentContainer: {
        padding: 16,
    },
    sectionContainer: {
        marginBottom: 20,
        backgroundColor: 'transparent',
        padding: 10,
        borderRadius: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.primary,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    badge: {
        backgroundColor: theme.colors.primaryContainer,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    badgeText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    mainInstruction: {
        fontSize: 15,
        color: '#444',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 12,
        lineHeight: 22,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: 12,
    },
    contentBlock: {
        marginBottom: 16,
        alignItems: 'center',
    },
    arabicText: {
        fontSize: 32,
        fontWeight: '400',
        color: '#B3261E',
        textAlign: 'center',
        lineHeight: 60,
        fontFamily: 'ScheherazadeNew',
        marginBottom: 8,
    },
    latinText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        lineHeight: 26,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    itemInstruction: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        marginBottom: 4,
        fontStyle: 'italic',
    },
    countBadge: {
        marginTop: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#444',
    },
});
