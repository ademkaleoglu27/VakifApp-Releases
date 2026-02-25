// AddReadingLogScreen.tsx - Screen for users to add their own daily reading
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, DeviceEventEmitter } from 'react-native';
import { PremiumHeader } from '@/components/PremiumHeader';
import { PageStepper } from '@/components/PageStepper';
import { theme } from '@/config/theme';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { useAuthStore } from '@/store/authStore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useVakifStore } from '@/store/vakifStore';
import { ReadingStatsService } from '@/services/ReadingStatsService';

export const AddReadingLogScreen = () => {
    const { user } = useAuthStore();
    const navigation = useNavigation<any>();
    const [pages, setPages] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [todayReading, setTodayReading] = useState<number>(0);

    useFocusEffect(
        useCallback(() => {
            loadTodayReading();
        }, [])
    );

    const loadTodayReading = async () => {
        try {
            // Use Centralized Service for Source of Truth Consistency
            // Correct params: 'week' (lowercase) and 'full' mode
            const stats = await ReadingStatsService.fetchLeaderboard('week', 'full');

            // Find current user's entry - RPC returns user_id field
            const myStats = stats.find((s: any) =>
                s.user_id === user?.id ||
                s.displayName === user?.name ||
                s.display_name === user?.name
            );

            if (myStats) {
                setTodayReading(myStats.total_pages || myStats.totalPages || 0);
            }
        } catch (error) {
            console.error('Failed to load today reading:', error);
        }
    };

    const handleSave = async () => {
        if (!pages || parseInt(pages) <= 0) {
            Alert.alert('Uyarı', 'Lütfen geçerli bir sayfa sayısı girin.');
            return;
        }

        if (!user?.id) {
            Alert.alert('Hata', 'Oturum açmanız gerekiyor.');
            return;
        }

        const currentVakifId = useVakifStore.getState().currentVakif?.id;

        // ✅ Sadece tamamen boş/sıfır ID'yi engelle
        const INVALID_IDS = [
            '00000000-0000-0000-0000-000000000000',
        ];

        if (!currentVakifId || INVALID_IDS.includes(currentVakifId)) {
            Alert.alert(
                'Vakıf Bulunamadı',
                'Lütfen uygulamadan çıkıp tekrar giriş yapın.'
            );
            return;
        }

        setIsSaving(true);
        try {
            await RisaleUserDb.addReadingLog({
                userId: user.id,
                workId: 'risale-i-nur',
                workTitle: 'Risale-i Nur',
                section: 'Genel',
                pagesRead: parseInt(pages),
                durationMinutes: 0,
                date: new Date().toISOString(),
                vakifId: currentVakifId
            });

            // DETERMINISTIC FIX: Link to contact_readings via user_id (not name-matching)
            // This ensures leaderboard/stats work correctly
            try {
                // Try user_id first (deterministic, requires SQL migration)
                let contact = await RisaleUserDb.getContactByUserId(user.id);

                // Fallback to name-matching for pre-migration data
                if (!contact) {
                    contact = await RisaleUserDb.getContactByName(user.name);
                }

                // AUTO-CREATE: If no contact exists, create one for this user
                if (!contact) {
                    const contactId = await RisaleUserDb.createContactForUser({
                        userId: user.id,
                        name: user.name || 'Kullanıcı',
                        surname: '',
                        phone: '',
                        groupType: 'SOHBET'
                    });
                    contact = { id: contactId };
                }

                if (contact) {
                    await RisaleUserDb.addContactReading(contact.id, parseInt(pages));
                }
            } catch (linkError) {
                console.warn('Contact reading link failed (non-critical):', linkError);
            }

            // Emit global event to easily trigger query invalidation
            DeviceEventEmitter.emit('READING_LOG_ADDED');

            Alert.alert(
                'Başarılı! 🎉',
                `${pages} sayfa okuma eklendi. Tebrikler!`,
                [{
                    text: 'Tamam', onPress: () => {
                        setPages('');
                        // Give local state a bump
                        setTodayReading(prev => prev + parseInt(pages));
                    }
                }]
            );
        } catch (error) {
            console.error('[AddReading] FAILED:', error);
            Alert.alert('Hata', 'Okuma eklenemedi. Lütfen tekrar deneyin.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
            <PremiumHeader title="Okuma Ekle" backButton={false} />

            <View style={styles.content}>
                {/* Stats Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statsIcon}>
                        <Ionicons name="book" size={32} color={theme.colors.primary} />
                    </View>
                    <View style={styles.statsInfo}>
                        <Text style={styles.statsLabel}>Bu Hafta Okuduğum</Text>
                        <Text style={styles.statsValue}>{todayReading} Sayfa</Text>
                    </View>
                </View>

                {/* Input Card */}
                <View style={styles.inputCard}>
                    <Text style={styles.inputTitle}>Bugün Kaç Sayfa Okudun?</Text>
                    <Text style={styles.inputSubtitle}>Günlük okuma hedefine ulaşmak için rakam gir</Text>

                    <PageStepper
                        value={pages}
                        onChange={setPages}
                        label=""
                        step={10}
                    />

                    {/* Quick buttons */}
                    <View style={styles.quickButtons}>
                        {[5, 10, 20, 50].map((num) => (
                            <TouchableOpacity
                                key={num}
                                style={[
                                    styles.quickBtn,
                                    pages === String(num) && styles.quickBtnActive
                                ]}
                                onPress={() => setPages(String(num))}
                            >
                                <Text style={[
                                    styles.quickBtnText,
                                    pages === String(num) && styles.quickBtnTextActive
                                ]}>{num}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        <Ionicons name="checkmark-circle" size={22} color="#fff" />
                        <Text style={styles.saveBtnText}>
                            {isSaving ? 'Kaydediliyor...' : 'OKUMA EKLE'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Motivation */}
                <View style={styles.motivationCard}>
                    <Ionicons name="sparkles" size={24} color="#f59e0b" />
                    <Text style={styles.motivationText}>
                        "Her gün biraz okumak, ruhun gıdasıdır."
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    content: {
        flex: 1,
        padding: 20
    },
    statsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3
    },
    statsIcon: {
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: '#ecfdf5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16
    },
    statsInfo: {
        flex: 1
    },
    statsLabel: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 4
    },
    statsValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.primary
    },
    inputCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3
    },
    inputTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 8
    },
    inputSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 24
    },
    quickButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 20,
        marginBottom: 24
    },
    quickBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    quickBtnActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary
    },
    quickBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b'
    },
    quickBtnTextActive: {
        color: '#fff'
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: 16
    },
    saveBtnDisabled: {
        opacity: 0.6
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    motivationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#fffbeb',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#fef3c7'
    },
    motivationText: {
        flex: 1,
        fontSize: 14,
        color: '#92400e',
        fontStyle: 'italic',
        fontWeight: '500'
    }
});
