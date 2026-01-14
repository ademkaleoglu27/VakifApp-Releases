import React, { useState, useEffect } from 'react';
import { Asset } from 'expo-asset';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { PremiumHeader } from '@/components/PremiumHeader';
import { useNavigation } from '@react-navigation/native';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudio } from '@/context/AudioContext';
import { AudioDownloadService } from '@/services/audioDownloadService';

// Audio Track tanımları (On-Demand)
const DUA_AUDIO_TRACKS: Record<string, { id: string; title: string; filename: string }> = {
    sabah_aksam: {
        id: 'sabah_aksam_dualari',
        title: 'Dost TV Sabah Duası',
        filename: 'sabah_aksam_dualari.mp3',
    },
};

// Dua kategorileri
interface DuaCategory {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    duaCount: number;
    hasAudio?: boolean;
    pdfSource?: any;
}

const DUA_CATEGORIES: DuaCategory[] = [
    {
        id: 'sabah_aksam',
        title: 'Sabah & Akşam Duaları',
        description: 'Günlük okunacak dualar',
        icon: 'sunny-outline',
        color: '#f59e0b',
        duaCount: 12,
        hasAudio: true,
    },
    {
        id: 'hatim_duasi',
        title: 'Hatim Duası',
        description: 'Kur\'an-ı Kerim hatim duası',
        icon: 'book-outline',
        color: '#6366f1',
        duaCount: 1,
    },
    {
        id: 'yemek',
        title: 'Yemek Duaları',
        description: 'Yemekten önce ve sonra',
        icon: 'restaurant-outline',
        color: '#10b981',
        duaCount: 1,
        // pdfSource removed to avoid static require error. 
        // We will load it via expo-asset if needed.
    },
];

export const DualarLandingScreen = () => {
    const navigation = useNavigation<any>();
    const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudio();

    // Download States
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

    // Check downloaded files on mount
    useEffect(() => {
        const checkDownloads = async () => {
            const newSet = new Set<string>();
            for (const key of Object.keys(DUA_AUDIO_TRACKS)) {
                const track = DUA_AUDIO_TRACKS[key];
                const exists = await AudioDownloadService.checkFileExists(track.filename);
                if (exists) {
                    newSet.add(track.id);
                }
            }
            setDownloadedIds(newSet);
        };
        checkDownloads();
    }, []);

    const handlePlayAudio = async (categoryId: string) => {
        const track = DUA_AUDIO_TRACKS[categoryId];
        if (!track) return;

        // If already playing this track, toggle
        if (currentTrack?.id === track.id) {
            await togglePlayPause();
            return;
        }

        const isDownloaded = downloadedIds.has(track.id) || await AudioDownloadService.checkFileExists(track.filename);

        if (!isDownloaded) {
            // Start Download
            setDownloadingId(track.id);
            setDownloadProgress(0);
            try {
                await AudioDownloadService.downloadFile(track.filename, (p) => setDownloadProgress(p));
                setDownloadedIds(prev => new Set(prev).add(track.id));
                setDownloadingId(null);

                // Auto play after download
                const localUri = AudioDownloadService.getLocalUri(track.filename);
                await playTrack({
                    id: track.id,
                    title: track.title,
                    source: { uri: localUri }
                });
            } catch (error) {
                console.error('Download failed', error);
                setDownloadingId(null);
                Alert.alert('Hata', 'İndirme başarısız oldu.');
            }
        } else {
            // Already downloaded, just play
            const localUri = AudioDownloadService.getLocalUri(track.filename);
            await playTrack({
                id: track.id,
                title: track.title,
                source: { uri: localUri }
            });
        }
    };

    const renderCard = (item: DuaCategory) => {
        const track = DUA_AUDIO_TRACKS[item.id];
        const isThisPlaying = track && currentTrack?.id === track.id && isPlaying;
        const isDownloadingThis = track && downloadingId === track.id;
        const isDownloaded = track && downloadedIds.has(track.id);

        return (
            <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => {
                    if (item.id === 'hatim_duasi') {
                        navigation.navigate('HatimDuasi');
                        return;
                    }

                    if (item.id === 'yemek') {
                        // Safe Load Pattern
                        const loadAndOpenPdf = async () => {
                            try {
                                // Dynamic require via expo-asset
                                const asset = Asset.fromModule(require('../../../../assets/dualar/yemek_duasi.pdf'));
                                await asset.downloadAsync();

                                if (asset.localUri || asset.uri) {
                                    // Normally verify file exists or open reader
                                    // For now, keep disabled but prove resolution works
                                    Alert.alert('Özellik Geçici Olarak Devre Dışı', 'Dua PDF okuyucu yakında yeniden eklenecektir.');
                                } else {
                                    throw new Error('Uri not resolved');
                                }
                            } catch (error) {
                                console.error('PDF Load Error:', error);
                                Alert.alert('Hata', 'Dosya yüklenemedi. Bağlantınızı kontrol edin.');
                            }
                        };

                        loadAndOpenPdf();
                    } else if (item.pdfSource) {
                        // Legacy fallback
                        Alert.alert('Özellik Geçici Olarak Devre Dışı', 'Dua PDF okuyucu yakında yeniden eklenecektir.');
                    }
                }}
            >
                <LinearGradient
                    colors={[item.color, adjustColor(item.color, -30)]}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name={item.icon} size={28} color="rgba(255,255,255,0.9)" />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardDescription}>{item.description}</Text>
                    </View>

                    {/* Audio Play Button */}
                    {item.hasAudio && (
                        <TouchableOpacity
                            style={[styles.playButton, isThisPlaying && styles.playButtonActive]}
                            onPress={(e) => {
                                e.stopPropagation();
                                handlePlayAudio(item.id);
                            }}
                        >
                            <Ionicons
                                name={isThisPlaying ? "pause" : "headset"}
                                size={20}
                                color={isThisPlaying ? '#fff' : item.color}
                            />
                        </TouchableOpacity>
                    )}

                    {!item.hasAudio && (
                        <View style={styles.duaCountBadge}>
                            <Text style={styles.duaCountText}>{item.duaCount} Dua</Text>
                        </View>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <PremiumHeader title="Dualar" backButton />

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.infoText}>
                    Yakında eklenecek! Dua içerikleri hazırlanıyor.
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.grid}>
                    {DUA_CATEGORIES.map(renderCard)}
                </View>
            </ScrollView>
        </View>
    );
};

// Helper to darken color for gradient
const adjustColor = (color: string, amount: number): string => {
    // Simple implementation - just return same color as gradient handles it
    return color;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc'
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#334155',
        fontWeight: '500',
    },
    scrollContent: {
        padding: 16,
    },
    grid: {
        gap: 16,
    },
    card: {
        height: 100,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    cardGradient: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500'
    },
    duaCountBadge: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    duaCountText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#fff',
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    playButtonActive: {
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
});
