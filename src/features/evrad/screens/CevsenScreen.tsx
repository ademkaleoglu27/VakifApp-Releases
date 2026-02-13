import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Platform, StatusBar, FlatList, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- TYPES ---
interface CevsenLine {
    arabic: string;
    latin: string;
    meal: string;
}

interface CevsenBab {
    id: number;
    title: string;
    lines: CevsenLine[];
    munacaat: {
        arabic: string;
        latin: string;
        meal: string;
    };
}

interface CevsenData {
    title: string;
    babs: CevsenBab[];
}

// --- DATA ---
const cevsenData: CevsenData = require('../../../../assets/books/cevsen_data.json');

// --- CONFIGURATION ---
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

type ViewMode = 'arabic' | 'latin' | 'meal';

const STORAGE_KEY = '@cevsen_settings';
const LAST_GROUP_KEY = '@cevsen_last_group';
const BABS_PER_GROUP = 10;

// Group babs into sections of 10
const getGroups = () => {
    const totalBabs = cevsenData.babs.length;
    const groups: { start: number; end: number; babs: CevsenBab[] }[] = [];
    for (let i = 0; i < totalBabs; i += BABS_PER_GROUP) {
        const start = i + 1;
        const end = Math.min(i + BABS_PER_GROUP, totalBabs);
        groups.push({
            start,
            end,
            babs: cevsenData.babs.slice(i, i + BABS_PER_GROUP),
        });
    }
    return groups;
};

const GROUPS = getGroups();

// --- READING VIEW COMPONENT ---

const ReadingView = ({
    group,
    onBack,
    groupIndex,
    totalGroups,
    onNavigateGroup,
}: {
    group: { start: number; end: number; babs: CevsenBab[] };
    onBack: () => void;
    groupIndex: number;
    totalGroups: number;
    onNavigateGroup: (idx: number) => void;
}) => {
    const [showSettings, setShowSettings] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('arabic');
    const [showMeal, setShowMeal] = useState(false);
    const [showLatin, setShowLatin] = useState(false);

    // Settings State
    const [fontSize, setFontSizeState] = useState(28);
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
                    if (s.viewMode) setViewMode(s.viewMode);
                    if (s.showMeal !== undefined) setShowMeal(s.showMeal);
                    if (s.showLatin !== undefined) setShowLatin(s.showLatin);
                } catch { }
            }
        }).catch(() => { });
    }, []);

    const persist = (patch: Record<string, any>) => {
        const merged = { fontSize, fontFamily, fontColor, viewMode, showMeal, showLatin, ...patch };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => { });
    };

    const changeFontSize = (delta: number) => {
        const next = Math.max(16, Math.min(54, fontSize + delta));
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

    const toggleMeal = () => {
        const next = !showMeal;
        setShowMeal(next);
        persist({ showMeal: next });
    };

    const toggleLatin = () => {
        const next = !showLatin;
        setShowLatin(next);
        persist({ showLatin: next });
    };

    // Save last read group
    useEffect(() => {
        AsyncStorage.setItem(LAST_GROUP_KEY, String(groupIndex)).catch(() => { });
    }, [groupIndex]);

    // Build flowing Arabic text for a bab (● separated)
    const buildFlowingArabic = (bab: CevsenBab): string => {
        return bab.lines.map(l => l.arabic).join(' ● ');
    };

    // Build flowing meal text
    const buildFlowingMeal = (bab: CevsenBab): string => {
        return bab.lines.map((l, i) => `${i + 1}) ${l.meal}`).join(' ');
    };

    // Build flowing latin text
    const buildFlowingLatin = (bab: CevsenBab): string => {
        return bab.lines.map((l, i) => `${i + 1}) ${l.latin}`).join(' ');
    };

    const mealFontSize = Math.max(12, fontSize * 0.42);
    const latinFontSize = Math.max(12, fontSize * 0.42);

    return (
        <SafeAreaView style={styles.readingContainer} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>
                        {group.start}-{group.end}. Bab
                    </Text>
                    <Text style={styles.headerSubtitle}>CEVŞENÜ'L-KEBİR</Text>
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
                    {/* Toggle: Meal */}
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Türkçe Meal</Text>
                        <TouchableOpacity
                            style={[styles.toggleBtn, showMeal && styles.toggleBtnActive]}
                            onPress={toggleMeal}
                        >
                            <Text style={[styles.toggleBtnText, showMeal && styles.toggleBtnTextActive]}>
                                {showMeal ? 'AÇIK' : 'KAPALI'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Toggle: Latin */}
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Türkçe Okunuş</Text>
                        <TouchableOpacity
                            style={[styles.toggleBtn, showLatin && styles.toggleBtnActive]}
                            onPress={toggleLatin}
                        >
                            <Text style={[styles.toggleBtnText, showLatin && styles.toggleBtnTextActive]}>
                                {showLatin ? 'AÇIK' : 'KAPALI'}
                            </Text>
                        </TouchableOpacity>
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

                    {/* Font Family */}
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

            {/* Content — Continuous Scroll */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Bismillah for first group */}
                {groupIndex === 0 && (
                    <View style={styles.bismillahContainer}>
                        <Text style={styles.mainTitleText}>Cevşen-ül Kebir</Text>
                        <Text style={[styles.bismillahArabic, { fontFamily }]}>
                            جوشن الكبير
                        </Text>
                        <Text style={[styles.bismillahArabic, { fontFamily, fontSize: fontSize * 0.85 }]}>
                            بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
                        </Text>
                    </View>
                )}

                {/* Render each bab in the group */}
                {group.babs.map((bab, babIdx) => (
                    <View key={bab.id} style={styles.babContainer}>
                        {/* Bab number header */}
                        <View style={styles.babHeader}>
                            <View style={styles.babHeaderLine} />
                            <Text style={styles.babHeaderText}>{bab.id}. Bab</Text>
                            <View style={styles.babHeaderLine} />
                        </View>

                        {/* Arabic text — flowing paragraph with ● */}
                        <Text
                            style={[
                                styles.flowingArabic,
                                {
                                    fontSize: fontSize,
                                    lineHeight: fontSize * 2,
                                    fontFamily: fontFamily,
                                    color: fontColor,
                                },
                            ]}
                        >
                            {buildFlowingArabic(bab)}
                        </Text>

                        {/* Münâcaat */}
                        <View style={styles.munacaatBlock}>
                            <Text
                                style={[
                                    styles.flowingArabic,
                                    {
                                        fontSize: fontSize * 0.9,
                                        lineHeight: fontSize * 1.7,
                                        fontFamily: fontFamily,
                                        color: '#1A237E',
                                    },
                                ]}
                            >
                                {bab.munacaat.arabic}
                            </Text>
                            <View style={styles.babNumberCircle}>
                                <Text style={styles.babNumberText}>﴿{bab.id}﴾</Text>
                            </View>
                        </View>

                        {/* Meal — shown below bab if enabled */}
                        {showMeal && (
                            <View style={styles.mealBlock}>
                                <Text style={[styles.mealFlowText, { fontSize: mealFontSize, lineHeight: mealFontSize * 1.6 }]}>
                                    {buildFlowingMeal(bab)}
                                    {` ${bab.lines.length + 1}) ${bab.munacaat.meal}`}
                                </Text>
                            </View>
                        )}

                        {/* Latin — shown below bab if enabled */}
                        {showLatin && (
                            <View style={styles.latinBlock}>
                                <Text style={[styles.latinFlowText, { fontSize: latinFontSize, lineHeight: latinFontSize * 1.6 }]}>
                                    {buildFlowingLatin(bab)}
                                    {` ${bab.lines.length + 1}) ${bab.munacaat.latin}`}
                                </Text>
                            </View>
                        )}
                    </View>
                ))}

                {/* Navigation Buttons */}
                <View style={styles.navButtonsContainer}>
                    {groupIndex > 0 && (
                        <TouchableOpacity
                            style={styles.navButton}
                            onPress={() => onNavigateGroup(groupIndex - 1)}
                        >
                            <Ionicons name="chevron-back" size={18} color="#8B4513" />
                            <Text style={styles.navButtonText}>
                                {GROUPS[groupIndex - 1].start}-{GROUPS[groupIndex - 1].end}. Bab
                            </Text>
                        </TouchableOpacity>
                    )}
                    <View style={{ flex: 1 }} />
                    {groupIndex < totalGroups - 1 && (
                        <TouchableOpacity
                            style={styles.navButton}
                            onPress={() => onNavigateGroup(groupIndex + 1)}
                        >
                            <Text style={styles.navButtonText}>
                                {GROUPS[groupIndex + 1].start}-{GROUPS[groupIndex + 1].end}. Bab
                            </Text>
                            <Ionicons name="chevron-forward" size={18} color="#8B4513" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

// --- GROUP CARD ---

const GroupCard = ({
    group,
    index,
    onPress,
}: {
    group: { start: number; end: number; babs: CevsenBab[] };
    index: number;
    onPress: () => void;
}) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.cardNumberContainer}>
            <Ionicons name="book-outline" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{group.start} - {group.end}. Bab</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
                {group.babs.map(b => b.title).slice(0, 3).join(' · ')}...
            </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </TouchableOpacity>
);

// --- MAIN SCREEN ---

export const CevsenScreen = () => {
    const navigation = useNavigation();
    const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
    const [lastGroupIndex, setLastGroupIndex] = useState<number | null>(null);

    useEffect(() => {
        AsyncStorage.getItem(LAST_GROUP_KEY).then(val => {
            if (val) setLastGroupIndex(parseInt(val, 10));
        }).catch(() => { });
    }, []);

    const handleNavigateGroup = (idx: number) => {
        setSelectedGroupIndex(idx);
    };

    if (selectedGroupIndex !== null && GROUPS[selectedGroupIndex]) {
        return (
            <ReadingView
                group={GROUPS[selectedGroupIndex]}
                onBack={() => setSelectedGroupIndex(null)}
                groupIndex={selectedGroupIndex}
                totalGroups={GROUPS.length}
                onNavigateGroup={handleNavigateGroup}
            />
        );
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
                    <Text style={styles.headerTitle}>CEVŞEN</Text>
                    <Text style={styles.headerSubtitle}>CEVŞENÜ'L-KEBİR</Text>
                </View>
            </View>

            {/* Last Read Banner */}
            {lastGroupIndex !== null && lastGroupIndex > 0 && (
                <TouchableOpacity
                    style={styles.lastReadBanner}
                    onPress={() => handleNavigateGroup(lastGroupIndex)}
                >
                    <Ionicons name="bookmark" size={18} color="#8B4513" />
                    <Text style={styles.lastReadText}>
                        Kaldığınız yer: {GROUPS[lastGroupIndex]?.start}-{GROUPS[lastGroupIndex]?.end}. Bab — Devam et
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#8B4513" />
                </TouchableOpacity>
            )}

            {/* Group List */}
            <FlatList
                data={GROUPS}
                keyExtractor={(_, index) => String(index)}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item, index }) => (
                    <GroupCard
                        group={item}
                        index={index}
                        onPress={() => handleNavigateGroup(index)}
                    />
                )}
            />
        </SafeAreaView>
    );
};

// --- STYLES ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    readingContainer: {
        flex: 1,
        backgroundColor: '#efe7d1',
    },
    scrollView: {
        flex: 1,
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
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
        letterSpacing: 2,
    },
    // Last Read Banner
    lastReadBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9E6',
        marginHorizontal: 20,
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E8D5A3',
    },
    lastReadText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '600',
        color: '#8B4513',
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
    toggleBtn: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(139,69,19,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(139,69,19,0.15)',
    },
    toggleBtnActive: {
        backgroundColor: '#8B4513',
        borderColor: '#8B4513',
    },
    toggleBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8B7355',
    },
    toggleBtnTextActive: {
        color: '#FFF',
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
        paddingTop: 4,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardNumberContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: theme.colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 3,
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    // Bismillah
    bismillahContainer: {
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(139,69,19,0.15)',
        marginBottom: 10,
    },
    mainTitleText: {
        fontSize: 26,
        fontWeight: '800',
        color: '#3E2723',
        marginBottom: 8,
        letterSpacing: 1,
    },
    bismillahArabic: {
        fontSize: 28,
        color: '#1A237E',
        fontFamily: 'ScheherazadeNew',
        textAlign: 'center',
        marginBottom: 6,
        lineHeight: 50,
    },
    // Content
    contentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    // Bab
    babContainer: {
        marginBottom: 12,
        paddingBottom: 8,
    },
    babHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
    },
    babHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(139,69,19,0.25)',
    },
    babHeaderText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8B4513',
        marginHorizontal: 16,
        letterSpacing: 1,
    },
    // Flowing Arabic
    flowingArabic: {
        fontSize: 28,
        fontWeight: '400',
        color: '#B3261E',
        textAlign: 'center',
        lineHeight: 56,
        fontFamily: 'ScheherazadeNew',
        writingDirection: 'rtl',
    },
    // Munacaat
    munacaatBlock: {
        marginTop: 8,
        alignItems: 'center',
        paddingBottom: 8,
    },
    babNumberCircle: {
        marginTop: 8,
        alignItems: 'center',
    },
    babNumberText: {
        fontSize: 18,
        color: '#8B4513',
        fontFamily: 'ScheherazadeNew',
    },
    // Meal
    mealBlock: {
        marginTop: 6,
        paddingHorizontal: 8,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#8B4513',
    },
    mealFlowText: {
        fontSize: 13,
        color: '#3E2723',
        lineHeight: 20,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    // Latin
    latinBlock: {
        marginTop: 6,
        paddingHorizontal: 8,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.35)',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#1A237E',
    },
    latinFlowText: {
        fontSize: 13,
        color: '#37474F',
        lineHeight: 20,
        fontStyle: 'italic',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    // Navigation Buttons
    navButtonsContainer: {
        flexDirection: 'row',
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(139,69,19,0.15)',
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139,69,19,0.08)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 4,
    },
    navButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B4513',
    },
});
