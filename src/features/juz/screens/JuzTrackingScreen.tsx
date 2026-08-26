import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    StatusBar,
    ActivityIndicator,
    SafeAreaView,
    Platform
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { useAuthStore } from '@/store/authStore';
import { hatimRealtimeService } from '@/services/hatimRealtimeService';
import { AnimatedJuzCard, HatimPartItem } from '../components/AnimatedJuzCard';
import { ConfettiEffect } from '@/components/ConfettiEffect';
import { HatimDuasiModal } from '../components/HatimDuasiModal';

export const JuzTrackingScreen: React.FC = () => {
    const { user } = useAuthStore();
    const navigation = useNavigation<any>();

    const [hatim, setHatim] = useState<any>(null);
    const [parts, setParts] = useState<HatimPartItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [selectedPart, setSelectedPart] = useState<HatimPartItem | null>(null);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [manageModalVisible, setManageModalVisible] = useState(false);
    const [assigneeName, setAssigneeName] = useState('');

    // Celebration & Duası States
    const [showConfetti, setShowConfetti] = useState(false);
    const [hatimDuasiVisible, setHatimDuasiVisible] = useState(false);
    const [hasCelebrated, setHasCelebrated] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadHatimData();
        }, [])
    );

    // ⚡ Supabase Realtime WebSocket Subscription
    useEffect(() => {
        if (!hatim?.id) return;

        console.log('[JuzTracking] Subscribing to realtime updates for hatim:', hatim.id);
        const unsubscribe = hatimRealtimeService.subscribe(hatim.id, (updatedPart) => {
            setParts((prevParts) => {
                const nextParts = prevParts.map((p) =>
                    p.id === updatedPart.id || p.juz_number === updatedPart.juz_number
                        ? { ...p, ...updatedPart }
                        : p
                );

                // Check if all 30 parts are now COMPLETED
                const completedCount = nextParts.filter((p) => p.status === 'COMPLETED').length;
                if (completedCount === 30 && !hasCelebrated) {
                    setShowConfetti(true);
                    setHasCelebrated(true);
                }

                return nextParts;
            });
        });

        return () => {
            unsubscribe();
        };
    }, [hatim?.id, hasCelebrated]);

    const loadHatimData = async () => {
        setLoading(true);
        try {
            let activeHatim = await RisaleUserDb.getActiveHatim();

            // Auto-create General Hatim if none exists
            if (!activeHatim) {
                await RisaleUserDb.createHatim('Genel Hatim', 'GENERAL');
                activeHatim = await RisaleUserDb.getActiveHatim();
            }

            setHatim(activeHatim);
            if (activeHatim) {
                const hatimParts = await RisaleUserDb.getHatimParts(activeHatim.id);
                setParts(hatimParts);

                // Check 30/30 completion
                const completedCount = hatimParts.filter((p: any) => p.status === 'COMPLETED').length;
                if (completedCount === 30 && !hasCelebrated) {
                    setShowConfetti(true);
                    setHasCelebrated(true);
                }
            }
        } catch (e) {
            console.error('[JuzTracking] Failed to load data:', e);
            Alert.alert('Hata', 'Cüz verileri yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handlePartPress = (part: HatimPartItem) => {
        setSelectedPart(part);
        if (part.status === 'AVAILABLE') {
            setAssigneeName('');
            setAssignModalVisible(true);
        } else {
            setManageModalVisible(true);
        }
    };

    const handleAssign = async (isSelf: boolean) => {
        if (!selectedPart) return;

        const name = isSelf ? (user?.name || 'Ben') : assigneeName;
        if (!name.trim()) {
            Alert.alert('Uyarı', 'Lütfen bir isim giriniz.');
            return;
        }

        try {
            await RisaleUserDb.assignPart(
                selectedPart.id,
                name,
                isSelf ? (user?.id || undefined) : undefined
            );

            // Optimistic update
            setParts((prev) =>
                prev.map((p) =>
                    p.id === selectedPart.id
                        ? {
                              ...p,
                              status: 'TAKEN',
                              assigned_to_name: name,
                              assigned_to_id: isSelf ? (user?.id || null) : null,
                          }
                        : p
                )
            );

            setAssignModalVisible(false);

            // Juz → { surahId, startVerse } map for Quran jump
            const juzStartMap: Record<number, { s: number; v: number }> = {
                1: { s: 1, v: 1 }, 2: { s: 2, v: 142 }, 3: { s: 2, v: 253 },
                4: { s: 3, v: 93 }, 5: { s: 4, v: 24 }, 6: { s: 4, v: 148 },
                7: { s: 5, v: 82 }, 8: { s: 6, v: 111 }, 9: { s: 7, v: 88 },
                10: { s: 8, v: 41 }, 11: { s: 9, v: 93 }, 12: { s: 11, v: 6 },
                13: { s: 12, v: 53 }, 14: { s: 15, v: 1 }, 15: { s: 17, v: 1 },
                16: { s: 18, v: 75 }, 17: { s: 21, v: 1 }, 18: { s: 23, v: 1 },
                19: { s: 25, v: 21 }, 20: { s: 27, v: 56 }, 21: { s: 29, v: 46 },
                22: { s: 33, v: 31 }, 23: { s: 36, v: 28 }, 24: { s: 39, v: 32 },
                25: { s: 41, v: 47 }, 26: { s: 46, v: 1 }, 27: { s: 51, v: 31 },
                28: { s: 58, v: 1 }, 29: { s: 67, v: 1 }, 30: { s: 78, v: 1 },
            };

            Alert.alert(
                'Cüz Alındı',
                `${selectedPart.juz_number}. Cüz kaydınıza eklendi. Şimdi Kur'an okumaya geçmek ister misiniz?`,
                [
                    { text: 'Daha Sonra', style: 'cancel' },
                    {
                        text: 'Okumaya Git',
                        onPress: () => {
                            const start = juzStartMap[selectedPart.juz_number] || { s: 1, v: 1 };
                            navigation.navigate('QuranTextReaderScreen', {
                                surahId: start.s,
                                startVerse: start.v,
                            });
                        },
                    },
                ]
            );
        } catch (e) {
            Alert.alert('Hata', 'Cüz atanamadı.');
        }
    };

    const handleRelease = async () => {
        if (!selectedPart) return;
        try {
            await RisaleUserDb.releasePart(selectedPart.id);
            setParts((prev) =>
                prev.map((p) =>
                    p.id === selectedPart.id
                        ? { ...p, status: 'AVAILABLE', assigned_to_name: null, assigned_to_id: null }
                        : p
                )
            );
            setManageModalVisible(false);
        } catch (e) {
            Alert.alert('Hata', 'İşlem başarısız.');
        }
    };

    const handleToggleComplete = async () => {
        if (!selectedPart) return;
        const newStatus = selectedPart.status === 'COMPLETED' ? 'TAKEN' : 'COMPLETED';

        try {
            await RisaleUserDb.togglePartComplete(selectedPart.id);

            setParts((prev) => {
                const next = prev.map((p) =>
                    p.id === selectedPart.id ? { ...p, status: newStatus as any } : p
                );

                const completed = next.filter((p) => p.status === 'COMPLETED').length;
                if (completed === 30 && !hasCelebrated) {
                    setShowConfetti(true);
                    setHasCelebrated(true);
                }

                return next;
            });

            setManageModalVisible(false);
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Durum güncellenemedi.');
        }
    };

    // Calculate Stats
    const availableCount = parts.filter((p) => p.status === 'AVAILABLE').length;
    const takenCount = parts.filter((p) => p.status === 'TAKEN').length;
    const completedCount = parts.filter((p) => p.status === 'COMPLETED').length;
    const progressPercent = Math.round((completedCount / 30) * 100);
    const isHatimComplete = completedCount === 30;

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Cüz havuzu senkronize ediliyor...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Confetti Cannon Effect */}
            <ConfettiEffect active={showConfetti} onComplete={() => setShowConfetti(false)} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleBox}>
                        <View style={styles.liveBadge}>
                            <View style={styles.livePulseDot} />
                            <Text style={styles.liveBadgeText}>CANLI HATİM</Text>
                        </View>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {hatim?.title || 'Genel Hatim'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.headerButton, isHatimComplete && styles.headerButtonGlow]}
                        onPress={() => setHatimDuasiVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="book" size={20} color="#ffffff" />
                    </TouchableOpacity>
                </View>

                {/* Progress & Live Stats Card */}
                <View style={styles.headerStatsCard}>
                    <View style={styles.statsTopRow}>
                        <View>
                            <Text style={styles.statsHeaderLabel}>Hatim İlerlemesi</Text>
                            <Text style={styles.statsHeaderCount}>
                                {completedCount} / 30 Cüz Okundu
                            </Text>
                        </View>
                        <View style={styles.progressPercentBadge}>
                            <Text style={styles.progressPercentText}>%{progressPercent}</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${Math.max(progressPercent, 4)}%` },
                            ]}
                        />
                    </View>

                    {/* Status Legend */}
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#CBD5E1' }]} />
                            <Text style={styles.legendText}>Boş: {availableCount}</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#FDBA74' }]} />
                            <Text style={styles.legendText}>Okunuyor: {takenCount}</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#86EFAC' }]} />
                            <Text style={styles.legendText}>Okundu: {completedCount}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Hatim Completed Celebration Banner */}
            {isHatimComplete && (
                <TouchableOpacity
                    style={styles.completedBanner}
                    onPress={() => setHatimDuasiVisible(true)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="sparkles" size={24} color="#F59E0B" />
                    <View style={styles.completedBannerText}>
                        <Text style={styles.completedBannerTitle}>🎉 Hatim Tamamlandı!</Text>
                        <Text style={styles.completedBannerSubtitle}>
                            Hatim Duasını okumak ve paylaşmak için dokunun.
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#B45309" />
                </TouchableOpacity>
            )}

            {/* Juz Grid */}
            <FlatList
                data={parts}
                renderItem={({ item }) => (
                    <AnimatedJuzCard
                        part={item}
                        onPress={handlePartPress}
                        currentUserId={user?.id}
                    />
                )}
                keyExtractor={(item) => item.id}
                numColumns={4}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* Assign Modal */}
            <Modal
                transparent
                visible={assignModalVisible}
                animationType="fade"
                onRequestClose={() => setAssignModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>{selectedPart?.juz_number}. Cüzü Al</Text>
                            <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.selfButton}
                            onPress={() => handleAssign(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="person" size={20} color="#ffffff" />
                            <Text style={styles.selfButtonText}>Kendim Alıyorum</Text>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>VEYA BAŞKASINA ATA</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="İsim Soyisim..."
                            placeholderTextColor="#94A3B8"
                            value={assigneeName}
                            onChangeText={setAssigneeName}
                            autoCorrect={false}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setAssignModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={() => handleAssign(false)}
                            >
                                <Text style={styles.confirmButtonText}>Kaydet</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Manage Modal */}
            <Modal
                transparent
                visible={manageModalVisible}
                animationType="fade"
                onRequestClose={() => setManageModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>
                                {selectedPart?.juz_number}. Cüz Yönetimi
                            </Text>
                            <TouchableOpacity onPress={() => setManageModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.manageInfoBox}>
                            <Text style={styles.manageInfoLabel}>Alan Kişi:</Text>
                            <Text style={styles.manageInfoName}>
                                {selectedPart?.assigned_to_name || 'İsimsiz'}
                            </Text>
                            <Text style={styles.manageInfoStatus}>
                                Durum:{' '}
                                {selectedPart?.status === 'COMPLETED' ? 'Okundu ✓' : 'Okunuyor ⏳'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.toggleButton,
                                selectedPart?.status === 'COMPLETED'
                                    ? styles.toggleButtonIncomplete
                                    : styles.toggleButtonComplete,
                            ]}
                            onPress={handleToggleComplete}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={
                                    selectedPart?.status === 'COMPLETED'
                                        ? 'refresh'
                                        : 'checkmark-circle'
                                }
                                size={20}
                                color="#ffffff"
                            />
                            <Text style={styles.toggleButtonText}>
                                {selectedPart?.status === 'COMPLETED'
                                    ? 'Okunmadı Olarak İşaretle'
                                    : 'Okundu Olarak İşaretle'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.releaseButton}
                            onPress={handleRelease}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            <Text style={styles.releaseButtonText}>Cüzü Boşa Çıkar (Bırak)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Hatim Duası Modal */}
            <HatimDuasiModal
                visible={hatimDuasiVisible}
                onClose={() => setHatimDuasiVisible(false)}
                hatimTitle={hatim?.title}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FAFAF9',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAFAF9',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    header: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 12 : 4,
        paddingBottom: 18,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerButtonGlow: {
        backgroundColor: '#F59E0B',
    },
    headerTitleBox: {
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 8,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 6,
    },
    livePulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4ADE80',
    },
    liveBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: 0.8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 2,
    },
    headerStatsCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    statsTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    statsHeaderLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statsHeaderCount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 2,
    },
    progressPercentBadge: {
        backgroundColor: theme.colors.primaryContainer,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    progressPercentText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 4,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    completedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 4,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#F59E0B',
        gap: 12,
    },
    completedBannerText: {
        flex: 1,
    },
    completedBannerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#92400E',
    },
    completedBannerSubtitle: {
        fontSize: 11,
        color: '#B45309',
        marginTop: 2,
    },
    listContent: {
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 40,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        width: '100%',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    selfButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
    },
    selfButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        gap: 10,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    dividerText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1E293B',
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: theme.colors.accent,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    manageInfoBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
    },
    manageInfoLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    manageInfoName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 2,
    },
    manageInfoStatus: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: 'bold',
        marginTop: 6,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        marginBottom: 10,
    },
    toggleButtonComplete: {
        backgroundColor: '#10B981',
    },
    toggleButtonIncomplete: {
        backgroundColor: '#F59E0B',
    },
    toggleButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    releaseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#FEE2E2',
        backgroundColor: '#FFF5F5',
    },
    releaseButtonText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#EF4444',
    },
});
