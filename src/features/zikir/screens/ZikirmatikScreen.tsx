import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Vibration,
    Modal,
    FlatList,
    Animated,
    Dimensions,
    Alert,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ZIKIR_PRESETS, ZikirItem } from '../data/zikirPresets';
import { ConfettiEffect } from '@/components/ConfettiEffect';
import { theme } from '@/config/theme';

const { width } = Dimensions.get('window');
const DIAL_SIZE = Math.min(width * 0.72, 280);
const STORAGE_PREFIX = '@zikir_count_v1_';

export const ZikirmatikScreen: React.FC = () => {
    const navigation = useNavigation();
    const [selectedZikir, setSelectedZikir] = useState<ZikirItem>(ZIKIR_PRESETS[0]);
    const [count, setCount] = useState<number>(0);
    const [target, setTarget] = useState<number>(ZIKIR_PRESETS[0].defaultTarget);
    const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
    const [fullscreenMode, setFullscreenMode] = useState<boolean>(false);
    const [showPresetsModal, setShowPresetsModal] = useState<boolean>(false);
    const [showTargetModal, setShowTargetModal] = useState<boolean>(false);
    const [showConfetti, setShowConfetti] = useState<boolean>(false);

    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        loadCount(selectedZikir.id);
    }, [selectedZikir]);

    const loadCount = async (zikirId: string) => {
        try {
            const saved = await AsyncStorage.getItem(`${STORAGE_PREFIX}${zikirId}`);
            setCount(saved ? parseInt(saved, 10) : 0);
        } catch {
            setCount(0);
        }
    };

    const saveCount = async (newCount: number) => {
        try {
            await AsyncStorage.setItem(`${STORAGE_PREFIX}${selectedZikir.id}`, String(newCount));
        } catch { }
    };

    const handleIncrement = () => {
        const next = count + 1;
        setCount(next);
        saveCount(next);

        // Haptic feedback
        if (vibrationEnabled) {
            if (target > 0 && next % target === 0) {
                // Target reached: Double strong vibration & confetti celebration!
                Vibration.vibrate([0, 100, 80, 150]);
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3500);
            } else if (next % 33 === 0) {
                // 33-step milestone
                Vibration.vibrate([0, 60, 40, 60]);
            } else {
                // Standard tap
                Vibration.vibrate(35);
            }
        }

        // Tap animation
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.94, duration: 50, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();
    };

    const handleReset = () => {
        Alert.alert(
            'Sayacı Sıfırla',
            `"${selectedZikir.name}" sayacını sıfırlamak istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sıfırla',
                    style: 'destructive',
                    onPress: () => {
                        setCount(0);
                        saveCount(0);
                    },
                },
            ]
        );
    };

    const handleSelectPreset = (item: ZikirItem) => {
        setSelectedZikir(item);
        setTarget(item.defaultTarget);
        setShowPresetsModal(false);
    };

    const TARGET_CHOICES = [33, 99, 100, 313, 500, 1000, 0]; // 0 = Limitsiz

    const progress = target > 0 ? Math.min(1, (count % target) / target) : 0;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.presetSelectorBtn}
                    onPress={() => setShowPresetsModal(true)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.presetSelectorText} numberOfLines={1}>
                        {selectedZikir.name}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#D1FAE5" />
                </TouchableOpacity>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.headerBtn, vibrationEnabled && styles.headerBtnActive]}
                        onPress={() => setVibrationEnabled(!vibrationEnabled)}
                    >
                        <MaterialCommunityIcons
                            name={vibrationEnabled ? 'vibrate' : 'vibrate-off'}
                            size={20}
                            color="#ffffff"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => setFullscreenMode(!fullscreenMode)}
                    >
                        <Ionicons
                            name={fullscreenMode ? 'contract' : 'expand'}
                            size={20}
                            color="#ffffff"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Confetti Celebration on target complete */}
            <ConfettiEffect active={showConfetti} />

            {/* Main Interactive Body */}
            <TouchableOpacity
                style={styles.bodyTouchable}
                activeOpacity={1}
                onPress={fullscreenMode ? handleIncrement : undefined}
            >
                {/* Zikir Card Info */}
                {!fullscreenMode && (
                    <View style={styles.infoCard}>
                        <Text style={styles.arabicText}>{selectedZikir.arabic}</Text>
                        <Text style={styles.turkishText}>{selectedZikir.turkish}</Text>
                        <Text style={styles.meaningText} numberOfLines={2}>
                            "{selectedZikir.meaning}"
                        </Text>
                    </View>
                )}

                {/* Target & Lap Controls Bar */}
                <View style={styles.targetBar}>
                    <TouchableOpacity
                        style={styles.targetBadge}
                        onPress={() => setShowTargetModal(true)}
                    >
                        <Ionicons name="flag-outline" size={14} color="#B45309" />
                        <Text style={styles.targetBadgeText}>
                            Hedef: {target > 0 ? target : 'Limitsiz'}
                        </Text>
                    </TouchableOpacity>

                    {target > 0 && (
                        <View style={styles.lapBadge}>
                            <Text style={styles.lapBadgeText}>
                                Tur: {Math.floor(count / target) + 1}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                        <Ionicons name="refresh" size={16} color="#78716C" />
                        <Text style={styles.resetBtnText}>Sıfırla</Text>
                    </TouchableOpacity>
                </View>

                {/* Central Counting Ring Dial */}
                <View style={styles.dialCenterContainer}>
                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <TouchableOpacity
                            style={styles.dialRing}
                            onPress={handleIncrement}
                            activeOpacity={0.85}
                        >
                            {/* Inner Gold Disc */}
                            <View style={styles.innerDisc}>
                                <Text style={styles.counterNumber}>{count}</Text>
                                <Text style={styles.tapToCountText}>DOKUN</Text>

                                {/* Target Progress Ring Bar */}
                                {target > 0 && (
                                    <View style={styles.progressTrack}>
                                        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Fullscreen Hint */}
                {fullscreenMode && (
                    <View style={styles.fullscreenHint}>
                        <Ionicons name="finger-print" size={18} color="#064E3B" />
                        <Text style={styles.fullscreenHintText}>
                            Ekranın herhangi bir yerine dokunarak zikir çekebilirsiniz
                        </Text>
                    </View>
                )}

                {/* Virtue Footer */}
                {!fullscreenMode && selectedZikir.virtue && (
                    <View style={styles.virtueBox}>
                        <Ionicons name="sparkles" size={14} color="#D97706" />
                        <Text style={styles.virtueText} numberOfLines={2}>
                            {selectedZikir.virtue}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Presets Modal */}
            <Modal
                visible={showPresetsModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowPresetsModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowPresetsModal(false)} style={styles.modalCloseBtn}>
                            <Ionicons name="close" size={24} color="#334155" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Zikir & Evrad Seçin</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <FlatList
                        data={ZIKIR_PRESETS}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16 }}
                        renderItem={({ item }) => {
                            const isSelected = selectedZikir.id === item.id;
                            return (
                                <TouchableOpacity
                                    style={[styles.presetCard, isSelected && styles.presetCardActive]}
                                    onPress={() => handleSelectPreset(item)}
                                >
                                    <View style={styles.presetCardTop}>
                                        <Text style={[styles.presetCardTitle, isSelected && styles.presetCardTitleActive]}>
                                            {item.name}
                                        </Text>
                                        <View style={styles.targetPill}>
                                            <Text style={styles.targetPillText}>{item.defaultTarget}x</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.presetArabic}>{item.arabic}</Text>
                                    <Text style={styles.presetTurkish}>{item.turkish}</Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </SafeAreaView>
            </Modal>

            {/* Target Modal */}
            <Modal
                visible={showTargetModal}
                animationType="fade"
                transparent
                onRequestClose={() => setShowTargetModal(false)}
            >
                <View style={styles.targetModalOverlay}>
                    <View style={styles.targetModalBox}>
                        <Text style={styles.targetModalTitle}>Zikir Hedefi Belirleyin</Text>
                        <View style={styles.targetGrid}>
                            {TARGET_CHOICES.map(choice => (
                                <TouchableOpacity
                                    key={choice}
                                    style={[
                                        styles.targetOption,
                                        target === choice && styles.targetOptionActive
                                    ]}
                                    onPress={() => {
                                        setTarget(choice);
                                        setShowTargetModal(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.targetOptionText,
                                        target === choice && styles.targetOptionTextActive
                                    ]}>
                                        {choice === 0 ? 'Limitsiz' : `${choice}`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={styles.targetModalCloseBtn}
                            onPress={() => setShowTargetModal(false)}
                        >
                            <Text style={styles.targetModalCloseText}>Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FAF5EA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: theme.colors.primary,
    },
    headerBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBtnActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },
    presetSelectorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        maxWidth: '55%',
    },
    presetSelectorText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 6,
    },
    bodyTouchable: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8D5A3',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    arabicText: {
        fontSize: 22,
        lineHeight: 38,
        color: '#1A237E',
        fontFamily: 'ScheherazadeNew',
        textAlign: 'center',
        marginBottom: 6,
    },
    turkishText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#78350F',
        textAlign: 'center',
        marginBottom: 4,
    },
    meaningText: {
        fontSize: 12,
        color: '#78716C',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    targetBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        marginVertical: 10,
    },
    targetBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    targetBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#B45309',
    },
    lapBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    lapBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#065F46',
    },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E7E5E4',
    },
    resetBtnText: {
        fontSize: 12,
        color: '#78716C',
        fontWeight: '600',
    },
    dialCenterContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    dialRing: {
        width: DIAL_SIZE,
        height: DIAL_SIZE,
        borderRadius: DIAL_SIZE / 2,
        backgroundColor: '#FFFFFF',
        borderWidth: 8,
        borderColor: '#E8D5A3',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#B45309',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
        elevation: 8,
    },
    innerDisc: {
        width: DIAL_SIZE - 32,
        height: DIAL_SIZE - 32,
        borderRadius: (DIAL_SIZE - 32) / 2,
        backgroundColor: '#FFFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#F59E0B',
    },
    counterNumber: {
        fontSize: 52,
        fontWeight: '900',
        color: theme.colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    tapToCountText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#B45309',
        letterSpacing: 2,
        marginTop: 2,
    },
    progressTrack: {
        width: '60%',
        height: 4,
        backgroundColor: '#E7E5E4',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 12,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
    },
    fullscreenHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#ECFDF5',
        paddingVertical: 8,
        borderRadius: 12,
    },
    fullscreenHintText: {
        fontSize: 12,
        color: '#065F46',
        fontWeight: '600',
    },
    virtueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    virtueText: {
        fontSize: 11,
        color: '#92400E',
        flex: 1,
        lineHeight: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    presetCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    presetCardActive: {
        backgroundColor: '#ECFDF5',
        borderColor: '#10B981',
        borderWidth: 1.5,
    },
    presetCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    presetCardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    presetCardTitleActive: {
        color: '#065F46',
    },
    targetPill: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    targetPillText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#475569',
    },
    presetArabic: {
        fontSize: 18,
        color: '#1A237E',
        fontFamily: 'ScheherazadeNew',
        textAlign: 'right',
        marginVertical: 4,
    },
    presetTurkish: {
        fontSize: 12,
        color: '#64748B',
        fontStyle: 'italic',
    },
    targetModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    targetModalBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
    },
    targetModalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1C1917',
        marginBottom: 16,
    },
    targetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        marginBottom: 16,
    },
    targetOption: {
        width: 70,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F5F5F4',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E7E5E4',
    },
    targetOptionActive: {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
    },
    targetOptionText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#78716C',
    },
    targetOptionTextActive: {
        color: '#B45309',
    },
    targetModalCloseBtn: {
        paddingVertical: 8,
        paddingHorizontal: 24,
        backgroundColor: '#F5F5F4',
        borderRadius: 10,
    },
    targetModalCloseText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#57534E',
    },
});
