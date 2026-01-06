import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, StatusBar, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { PremiumHeader } from '@/components/PremiumHeader';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { useAuthStore } from '@/store/authStore';
import { Q_JUZ_MAP } from '@/config/quranMaps';
import { useNavigation } from '@react-navigation/native';

interface HatimPart {
    id: string;
    hatim_id: string;
    juz_number: number;
    status: 'AVAILABLE' | 'TAKEN' | 'COMPLETED';
    assigned_to_name?: string;
    assigned_to_id?: string;
}

export const JuzTrackingScreen = () => {
    const { user } = useAuthStore();
    const [hatim, setHatim] = useState<any>(null);
    const [parts, setParts] = useState<HatimPart[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Modal States
    const [selectedPart, setSelectedPart] = useState<HatimPart | null>(null);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [manageModalVisible, setManageModalVisible] = useState(false);
    const [assigneeName, setAssigneeName] = useState('');

    useFocusEffect(
        useCallback(() => {
            loadHatimData();
        }, [])
    );

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
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Veriler yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handlePartPress = (part: HatimPart) => {
        setSelectedPart(part);
        if (part.status === 'AVAILABLE') {
            setAssigneeName(''); // Reset
            setAssignModalVisible(true);
        } else {
            setManageModalVisible(true);
        }
    };

    const navigation = useNavigation<any>();

    const handleAssign = async (isSelf: boolean) => {
        if (!selectedPart) return;

        const name = isSelf ? (user?.name || 'Ben') : assigneeName;
        // Basic validation
        if (!name.trim()) {
            Alert.alert('Uyarı', 'Lütfen bir isim giriniz.');
            return;
        }

        try {
            await RisaleUserDb.assignPart(selectedPart.id, name, isSelf ? (user?.id || undefined) : undefined);
            setAssignModalVisible(false);
            setRefreshTrigger(prev => prev + 1);

            // Ask to go to reading
            Alert.alert(
                'Cüz Alındı',
                `${selectedPart.juz_number}. Cüz listenize eklendi. Şimdi okumak ister misiniz?`,
                [
                    { text: 'Daha Sonra', style: 'cancel' },
                    {
                        text: 'Okumaya Git',
                        onPress: () => {
                            const startPage = Q_JUZ_MAP[selectedPart.juz_number] || 1;
                            navigation.navigate('QuranPdfReader', { page: startPage });
                        }
                    }
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
            setManageModalVisible(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (e) {
            Alert.alert('Hata', 'İşlem başarısız.');
        }
    };

    const handleToggleComplete = async () => {
        if (!selectedPart) return;
        try {
            await RisaleUserDb.togglePartComplete(selectedPart.id);
            setManageModalVisible(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (e) {
            console.error(e);
        }
    };

    const renderItem = ({ item }: { item: HatimPart }) => {
        const isAvailable = item.status === 'AVAILABLE';
        const isCompleted = item.status === 'COMPLETED';
        const isTaken = item.status === 'TAKEN';

        // Colors
        let bgColor = '#f1f5f9'; // Available default (slate-100)
        let borderColor = '#e2e8f0';
        let textColor = '#64748b';

        if (isTaken) {
            bgColor = '#fff7ed'; // Orange-50
            borderColor = '#fdba74'; // Orange-300
            textColor = '#c2410c'; // Orange-700
        } else if (isCompleted) {
            bgColor = '#f0fdf4'; // Green-50
            borderColor = '#86efac'; // Green-300
            textColor = '#15803d'; // Green-700
        }

        return (
            <TouchableOpacity
                style={[styles.gridItem, { backgroundColor: bgColor, borderColor }]}
                onPress={() => handlePartPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.gridHeader}>
                    <Text style={[styles.juzNumber, { color: isAvailable ? '#94a3b8' : textColor }]}>
                        {item.juz_number}
                    </Text>
                    {isCompleted && <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />}
                </View>

                {isAvailable ? (
                    <View style={styles.centerContent}>
                        <Ionicons name="add-circle-outline" size={24} color="#cbd5e1" />
                        <Text style={styles.availableText}>Al</Text>
                    </View>
                ) : (
                    <View style={styles.takenContent}>
                        <Text style={[styles.assigneeName, { color: textColor }]} numberOfLines={2}>
                            {item.assigned_to_name}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            <PremiumHeader
                title="Cüz Takibi"
                subtitle={hatim?.title || "Genel Hatim"}
            />

            <FlatList
                data={parts}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={4}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <View style={[styles.dot, { backgroundColor: '#e2e8f0' }]} />
                            <Text style={styles.statLabel}>Boş</Text>
                        </View>
                        <View style={styles.statItem}>
                            <View style={[styles.dot, { backgroundColor: '#fdba74' }]} />
                            <Text style={styles.statLabel}>Alındı</Text>
                        </View>
                        <View style={styles.statItem}>
                            <View style={[styles.dot, { backgroundColor: '#86efac' }]} />
                            <Text style={styles.statLabel}>Okundu</Text>
                        </View>
                    </View>
                }
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
                        <Text style={styles.modalTitle}>{selectedPart?.juz_number}. Cüzü Ata</Text>

                        <TouchableOpacity
                            style={styles.selfButton}
                            onPress={() => handleAssign(true)}
                        >
                            <Ionicons name="person" size={20} color="white" />
                            <Text style={styles.selfButtonText}>Kendim Alıyorum</Text>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <Text style={styles.dividerText}>VEYA</Text>
                        </View>

                        <Text style={styles.inputLabel}>Başkasına Ata:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="İsim Soyisim"
                            value={assigneeName}
                            onChangeText={setAssigneeName}
                            autoCorrect={false}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setAssignModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmButton} onPress={() => handleAssign(false)}>
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
                        <Text style={styles.modalTitle}>{selectedPart?.juz_number}. Cüz Yönetimi</Text>
                        <Text style={styles.modalSubtitle}>
                            Sahibi: <Text style={{ fontWeight: 'bold' }}>{selectedPart?.assigned_to_name}</Text>
                        </Text>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                            onPress={handleToggleComplete}
                        >
                            <Ionicons
                                name={selectedPart?.status === 'COMPLETED' ? "checkmark-circle" : "checkmark-circle-outline"}
                                size={22} color="white"
                            />
                            <Text style={styles.actionButtonText}>
                                {selectedPart?.status === 'COMPLETED' ? 'Okunmadı Olarak İşaretle' : 'Okundu Olarak İşaretle'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.colors.primary, marginTop: 12 }]}
                            onPress={() => {
                                if (selectedPart) {
                                    setManageModalVisible(false);
                                    const startPage = Q_JUZ_MAP[selectedPart.juz_number] || 1;
                                    navigation.navigate('QuranPdfReader', { page: startPage });
                                }
                            }}
                        >
                            <Ionicons name="book-outline" size={22} color="white" />
                            <Text style={styles.actionButtonText}>Cüze Git (Oku)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.colors.error, marginTop: 12 }]}
                            onPress={handleRelease}
                        >
                            <Ionicons name="close-circle-outline" size={22} color="white" />
                            <Text style={styles.actionButtonText}>Cüzü İptal Et (Boşa Çıkar)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closeButton} onPress={() => setManageModalVisible(false)}>
                            <Text style={styles.closeButtonText}>Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    gridItem: {
        width: '23%', // 4 columns with spacing
        aspectRatio: 0.85,
        borderRadius: 12,
        borderWidth: 1,
        padding: 8,
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    gridHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    juzNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginTop: -4
    },
    takenContent: {
        flex: 1,
        justifyContent: 'center',
    },
    availableText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 2
    },
    assigneeName: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    statLabel: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '500',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        alignItems: 'stretch',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 20,
    },
    selfButton: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    selfButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    dividerText: {
        flex: 1,
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
    },
    inputLabel: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
    },
    confirmButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#64748b',
        fontWeight: 'bold',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    actionButton: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    closeButton: {
        marginTop: 16,
        padding: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#64748b',
        fontWeight: '600',
    }
});
