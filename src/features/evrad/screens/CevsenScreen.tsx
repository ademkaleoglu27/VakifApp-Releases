import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Platform, StatusBar, FlatList, Dimensions, useWindowDimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ConfettiEffect } from '@/components/ConfettiEffect';
import { CevsenDuasiModal } from '../components/CevsenDuasiModal';
import { CevsenAudioPlayer } from '../components/CevsenAudioPlayer';
import { lastReadService } from '@/services/lastReadService';

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
const COMPLETED_GROUPS_KEY = '@cevsen_completed_groups_v1';
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

// Haftalık Okuma Planı (7 Günlük)
const WEEKLY_PLAN = [
    { day: 'Pazartesi', range: '1 - 14. Bab' },
    { day: 'Salı', range: '15 - 28. Bab' },
    { day: 'Çarşamba', range: '29 - 42. Bab' },
    { day: 'Perşembe', range: '43 - 56. Bab' },
    { day: 'Cuma', range: '57 - 70. Bab' },
    { day: 'Cumartesi', range: '71 - 84. Bab' },
    { day: 'Pazar', range: '85 - 100. Bab + Dua' },
];

// --- READING VIEW COMPONENT ---

const ReadingView = ({
    group,
    onBack,
    groupIndex,
    totalGroups,
    onNavigateGroup,
    completedGroups,
    onToggleGroupComplete,
}: {
    group: { start: number; end: number; babs: CevsenBab[] };
    onBack: () => void;
    groupIndex: number;
    totalGroups: number;
    onNavigateGroup: (idx: number) => void;
    completedGroups: number[];
    onToggleGroupComplete: (idx: number) => void;
}) => {
    useFocusEffect(
        React.useCallback(() => {
            ScreenOrientation.unlockAsync();
            return () => {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            };
        }, [])
    );

    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const [showSettings, setShowSettings] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('arabic');
    const [showMeal, setShowMeal] = useState(false);
    const [showLatin, setShowLatin] = useState(false);

    // Active listening Bab
    const [activeBabNumber, setActiveBabNumber] = useState<number>(group.start);
    const [showConfetti, setShowConfetti] = useState(false);
    const [duaModalVisible, setDuaModalVisible] = useState(false);

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

        // Record to universal last read manager
        lastReadService.recordLastRead({
            id: 'cevsen_reader',
            type: 'cevsen',
            title: 'Cevşen-ül Kebir',
            subtitle: `${group.label} • ${group.start}-${group.end}. Bab`,
            screenName: 'CevsenScreen',
            params: { initialGroupIndex: groupIndex },
        }).catch(() => { });
    }, [groupIndex]);

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

    const isGroupCompleted = completedGroups.includes(groupIndex);

    const handleCompleteSection = () => {
        onToggleGroupComplete(groupIndex);
        setShowConfetti(true);

        if (group.end === 100 || groupIndex === totalGroups - 1) {
            Alert.alert(
                '🎉 Tebrikler!',
                'Cevşenü\'l-Kebir\'in tamamını bitirdiniz. Hatim ve Münâcaat duasını okumak ister misiniz?',
                [
                    { text: 'Daha Sonra', style: 'cancel' },
                    { text: 'Duayı Oku', onPress: () => setDuaModalVisible(true) }
                ]
            );
        }
    };

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

            {/* Confetti Cannon Effect */}
            <ConfettiEffect active={showConfetti} onComplete={() => setShowConfetti(false)} />

            {/* Header */}
            {!isLandscape && (
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
                        style={[styles.settingsButton, isGroupCompleted && styles.completedHeaderBtn]}
                        onPress={handleCompleteSection}
                    >
                        <Ionicons
                            name={isGroupCompleted ? "checkmark-circle" : "checkmark-circle-outline"}
                            size={22}
                            color={isGroupCompleted ? "#FBBF24" : "#FFF"}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => setShowSettings(!showSettings)}
                    >
                        <Ionicons name={showSettings ? 'close' : 'settings-outline'} size={22} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}

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
                        <View style={styles.fontFamilyControls}>
                            {FONT_OPTIONS.map(f => (
                                <TouchableOpacity
                                    key={f.key}
                                    style={[styles.fontFamilyBtn, fontFamily === f.key && styles.fontFamilyBtnActive]}
                                    onPress={() => changeFontFamily(f.key)}
                                >
                                    <Text style={[styles.fontFamilyBtnText, fontFamily === f.key && styles.fontFamilyBtnTextActive]}>
                                        {f.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Font Color */}
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Metin Rengi</Text>
                        <View style={styles.colorControls}>
                            {COLOR_OPTIONS.map(c => (
                                <TouchableOpacity
                                    key={c.key}
                                    style={[
                                        styles.colorDot,
                                        { backgroundColor: c.key },
                                        fontColor === c.key && styles.colorDotActive,
                                    ]}
                                    onPress={() => changeFontColor(c.key)}
                                />
                            ))}
                        </View>
                    </View>
                </View>
            )}

            {/* Reading Content */}
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
                {group.babs.map((bab) => {
                    const isAudioActive = activeBabNumber === bab.id;
                    return (
                        <TouchableOpacity
                            key={bab.id}
                            style={[
                                styles.babContainer,
                                isAudioActive && styles.babContainerAudioActive,
                            ]}
                            onPress={() => setActiveBabNumber(bab.id)}
                            activeOpacity={0.85}
                        >
                            {/* Bab number header */}
                            <View style={styles.babHeader}>
                                <View style={styles.babHeaderLine} />
                                <View style={[styles.babBadge, isAudioActive && styles.babBadgeActive]}>
                                    <Text style={[styles.babHeaderText, isAudioActive && styles.babHeaderTextActive]}>
                                        {bab.id}. Bab
                                    </Text>
                                    {isAudioActive ? (
                                        <Ionicons name="volume-high" size={15} color="#B45309" />
                                    ) : (
                                        <Ionicons name="play-circle-outline" size={15} color="#8B4513" />
                                    )}
                                </View>
                                <View style={styles.babHeaderLine} />
                            </View>

                            {/* Arabic text */}
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

                            {/* Meal */}
                            {showMeal && (
                                <View style={styles.mealBlock}>
                                    <Text style={[styles.mealFlowText, { fontSize: mealFontSize, lineHeight: mealFontSize * 1.6 }]}>
                                        {buildFlowingMeal(bab)}
                                        {` ${bab.lines.length + 1}) ${bab.munacaat.meal}`}
                                    </Text>
                                </View>
                            )}

                            {/* Latin */}
                            {showLatin && (
                                <View style={styles.latinBlock}>
                                    <Text style={[styles.latinFlowText, { fontSize: latinFontSize, lineHeight: latinFontSize * 1.6 }]}>
                                        {buildFlowingLatin(bab)}
                                        {` ${bab.lines.length + 1}) ${bab.munacaat.latin}`}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}

                {/* Section Completion & Dua Actions */}
                <View style={styles.sectionActionsCard}>
                    <TouchableOpacity
                        style={[
                            styles.sectionCompleteBtn,
                            isGroupCompleted && styles.sectionCompleteBtnActive,
                        ]}
                        onPress={handleCompleteSection}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={isGroupCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                            size={22}
                            color="#ffffff"
                        />
                        <Text style={styles.sectionCompleteBtnText}>
                            {isGroupCompleted ? 'Bölüm Tamamlandı ✓' : 'Bu Bölümü Tamamla (10 Bab)'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.openDuaBtn}
                        onPress={() => setDuaModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="book-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.openDuaBtnText}>Cevşen Duasını Oku</Text>
                    </TouchableOpacity>
                </View>

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

                <View style={{ height: 90 }} />
            </ScrollView>

            {/* Sticky Floating Audio Player & Tracker */}
            <CevsenAudioPlayer
                currentBab={activeBabNumber}
                startBab={group.start}
                endBab={group.end}
                onBabChange={(nextBab) => setActiveBabNumber(nextBab)}
            />

            {/* Cevşen Duası Modal */}
            <CevsenDuasiModal
                visible={duaModalVisible}
                onClose={() => setDuaModalVisible(false)}
                currentBabRange={`${group.start}-${group.end}. Bab`}
            />
        </SafeAreaView>
    );
};

// --- GROUP CARD ---

const GroupCard = ({
    group,
    index,
    onPress,
    isCompleted,
}: {
    group: { start: number; end: number; babs: CevsenBab[] };
    index: number;
    onPress: () => void;
    isCompleted: boolean;
}) => (
    <TouchableOpacity
        style={[styles.card, isCompleted && styles.cardCompleted]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.cardNumberContainer, isCompleted && styles.cardNumberContainerCompleted]}>
            <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'book-outline'}
                size={22}
                color={isCompleted ? '#10B981' : theme.colors.primary}
            />
        </View>
        <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{group.start} - {group.end}. Bab</Text>
                {isCompleted && (
                    <Text style={styles.completedBadgeLabel}>Okundu ✓</Text>
                )}
            </View>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
                {group.babs.map(b => b.title).slice(0, 3).join(' · ')}...
            </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isCompleted ? '#10B981' : '#CBD5E1'} />
    </TouchableOpacity>
);

// --- MAIN SCREEN ---

export const CevsenScreen = () => {
    const navigation = useNavigation();
    const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
    const [lastGroupIndex, setLastGroupIndex] = useState<number | null>(null);
    const [completedGroups, setCompletedGroups] = useState<number[]>([]);
    const [duaModalVisible, setDuaModalVisible] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(LAST_GROUP_KEY).then(val => {
            if (val) setLastGroupIndex(parseInt(val, 10));
        }).catch(() => { });

        AsyncStorage.getItem(COMPLETED_GROUPS_KEY).then(val => {
            if (val) setCompletedGroups(JSON.parse(val));
        }).catch(() => { });
    }, []);

    const toggleGroupComplete = async (idx: number) => {
        let updated: number[];
        if (completedGroups.includes(idx)) {
            updated = completedGroups.filter(i => i !== idx);
        } else {
            updated = [...completedGroups, idx];
        }
        setCompletedGroups(updated);
        await AsyncStorage.setItem(COMPLETED_GROUPS_KEY, JSON.stringify(updated));
    };

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
                completedGroups={completedGroups}
                onToggleGroupComplete={toggleGroupComplete}
            />
        );
    }

    const progressPercentage = Math.round((completedGroups.length / GROUPS.length) * 100);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>CEVŞEN</Text>
                    <Text style={styles.headerSubtitle}>CEVŞENÜ'L-KEBİR (100 BAB)</Text>
                </View>
                <TouchableOpacity
                    style={styles.duaHeaderButton}
                    onPress={() => setDuaModalVisible(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="book" size={18} color="#FBBF24" />
                    <Text style={styles.duaHeaderButtonText}>Dua</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Progress Overview Card */}
                <View style={styles.progressCard}>
                    <View style={styles.progressTopRow}>
                        <View>
                            <Text style={styles.progressLabel}>Cevşen Okuma İlerlemesi</Text>
                            <Text style={styles.progressCountText}>
                                {completedGroups.length * 10} / 100 Bab Tamamlandı
                            </Text>
                        </View>
                        <View style={styles.percentageBadge}>
                            <Text style={styles.percentageText}>%{progressPercentage}</Text>
                        </View>
                    </View>

                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${Math.max(progressPercentage, 4)}%` },
                            ]}
                        />
                    </View>
                </View>

                {/* Last Read Banner */}
                {lastGroupIndex !== null && lastGroupIndex >= 0 && (
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

                {/* 7-Day Weekly Guide Banner */}
                <View style={styles.weeklyPlanCard}>
                    <View style={styles.weeklyHeader}>
                        <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.weeklyTitle}>Haftalık Okuma Takvimi (Sünnet-i Seniyye)</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weeklyScroll}>
                        {WEEKLY_PLAN.map((plan, i) => (
                            <View key={i} style={styles.weeklyPill}>
                                <Text style={styles.weeklyDayText}>{plan.day}</Text>
                                <Text style={styles.weeklyRangeText}>{plan.range}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Group List */}
                <View style={styles.listContainer}>
                    {GROUPS.map((item, index) => (
                        <GroupCard
                            key={index}
                            group={item}
                            index={index}
                            isCompleted={completedGroups.includes(index)}
                            onPress={() => handleNavigateGroup(index)}
                        />
                    ))}
                </View>
            </ScrollView>

            {/* Cevşen Duası Modal */}
            <CevsenDuasiModal
                visible={duaModalVisible}
                onClose={() => setDuaModalVisible(false)}
                currentBabRange="100 Bab Hatmi"
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
        paddingBottom: 20,
        paddingTop: Platform.OS === 'android' ? 14 : 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
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
    completedHeaderBtn: {
        backgroundColor: 'rgba(251, 191, 36, 0.25)',
    },
    duaHeaderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    duaHeaderButtonText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
        fontWeight: '600',
    },
    progressCard: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginTop: 14,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    progressTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    progressLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    progressCountText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 2,
    },
    percentageBadge: {
        backgroundColor: theme.colors.primaryContainer,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    percentageText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    progressBarBg: {
        height: 7,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 4,
    },
    weeklyPlanCard: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    weeklyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    weeklyTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#334155',
    },
    weeklyScroll: {
        flexDirection: 'row',
    },
    weeklyPill: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    weeklyDayText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    weeklyRangeText: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 2,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    bismillahContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(139, 69, 19, 0.2)',
    },
    mainTitleText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#8B4513',
        marginBottom: 8,
    },
    bismillahArabic: {
        fontSize: 28,
        color: '#8B4513',
        textAlign: 'center',
        marginVertical: 4,
    },
    babContainer: {
        backgroundColor: '#FAF5EA',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(139, 69, 19, 0.15)',
    },
    babContainerAudioActive: {
        borderColor: theme.colors.accent,
        borderWidth: 2,
        backgroundColor: '#FFFDF5',
    },
    babHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    babBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#EFE3CA',
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 12,
        marginHorizontal: 8,
    },
    babBadgeActive: {
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    babHeaderTextActive: {
        color: '#B45309',
    },
    babHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(139, 69, 19, 0.2)',
    },
    babHeaderText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#8B4513',
    },
    flowingArabic: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    munacaatBlock: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(26, 35, 126, 0.15)',
        alignItems: 'center',
    },
    babNumberCircle: {
        marginTop: 6,
    },
    babNumberText: {
        fontSize: 14,
        color: '#8B4513',
        fontWeight: 'bold',
    },
    mealBlock: {
        backgroundColor: '#F0EAD6',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
    },
    mealFlowText: {
        color: '#3E2723',
        lineHeight: 20,
    },
    latinBlock: {
        backgroundColor: '#E8DFD0',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    latinFlowText: {
        color: '#4E342E',
        fontStyle: 'italic',
        lineHeight: 20,
    },
    sectionActionsCard: {
        marginVertical: 14,
        gap: 10,
    },
    sectionCompleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1E293B',
        borderRadius: 14,
        paddingVertical: 14,
    },
    sectionCompleteBtnActive: {
        backgroundColor: '#10B981',
    },
    sectionCompleteBtnText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    openDuaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
    },
    openDuaBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    navButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFE3CA',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    navButtonText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#8B4513',
    },
    settingsPanel: {
        backgroundColor: '#FAF5EA',
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(139, 69, 19, 0.2)',
        gap: 12,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5D4037',
    },
    toggleBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#EFE3CA',
    },
    toggleBtnActive: {
        backgroundColor: '#8B4513',
    },
    toggleBtnText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#8B4513',
    },
    toggleBtnTextActive: {
        color: '#FFF',
    },
    fontSizeControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fontSizeBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: '#EFE3CA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fontSizeBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#8B4513',
    },
    fontSizeValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#5D4037',
        minWidth: 24,
        textAlign: 'center',
    },
    fontFamilyControls: {
        flexDirection: 'row',
        gap: 6,
    },
    fontFamilyBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#EFE3CA',
    },
    fontFamilyBtnActive: {
        backgroundColor: '#8B4513',
    },
    fontFamilyBtnText: {
        fontSize: 11,
        color: '#8B4513',
        fontWeight: '600',
    },
    fontFamilyBtnTextActive: {
        color: '#FFF',
    },
    colorControls: {
        flexDirection: 'row',
        gap: 10,
    },
    colorDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorDotActive: {
        borderColor: '#8B4513',
        transform: [{ scale: 1.15 }],
    },
    lastReadBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        marginHorizontal: 16,
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        gap: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#D97706',
    },
    lastReadText: {
        flex: 1,
        fontSize: 12,
        color: '#92400E',
        fontWeight: '600',
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    cardCompleted: {
        borderColor: '#86EFAC',
        backgroundColor: '#F0FDF4',
    },
    cardNumberContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    cardNumberContainerCompleted: {
        backgroundColor: '#DCFCE7',
    },
    cardContent: {
        flex: 1,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    completedBadgeLabel: {
        fontSize: 11,
        color: '#10B981',
        fontWeight: 'bold',
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
});
