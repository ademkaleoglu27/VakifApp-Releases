import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, StatusBar, Modal, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { theme } from '@/config/theme';
import { useCevsenStore } from '@/store/cevsenStore';
import { CevsenPages } from '@/assets/cevsen';
import { useAudio } from '@/context/AudioContext';

import { AudioDownloadService } from '@/services/audioDownloadService';

// Cevşen Audio Tracks - 4 Parts
const CEVSEN_AUDIO_TRACKS = [
    {
        id: 'cevsen_part1',
        title: 'İhsan Atasoy - Cevşen 1. Parça',
        filename: 'cevsen_part1.mp3',
    },
    {
        id: 'cevsen_part2',
        title: 'İhsan Atasoy - Cevşen 2. Parça',
        filename: 'cevsen_part2.mp3',
    },
    {
        id: 'cevsen_part3',
        title: 'İhsan Atasoy - Cevşen 3. Parça',
        filename: 'cevsen_part3.mp3',
    },
    {
        id: 'cevsen_part4',
        title: 'İhsan Atasoy - Cevşen 4. Parça',
        filename: 'cevsen_part4.mp3',
    },
];

export const CevsenLandingScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { lastPage } = useCevsenStore();
    const [showGoToPage, setShowGoToPage] = useState(false);
    const [targetPageInput, setTargetPageInput] = useState('');
    const [showAudioModal, setShowAudioModal] = useState(false);

    // Audio Context for playing Cevşen
    const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudio();

    // Download States
    const [downloadingPartId, setDownloadingPartId] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadedParts, setDownloadedParts] = useState<Set<string>>(new Set());

    // Check existing downloads on mount or when modal opens
    useEffect(() => {
        if (showAudioModal) {
            checkDownloads();
        }
    }, [showAudioModal]);

    const checkDownloads = async () => {
        const newSet = new Set<string>();
        for (const track of CEVSEN_AUDIO_TRACKS) {
            const exists = await AudioDownloadService.checkFileExists(track.filename);
            if (exists) {
                newSet.add(track.id);
            }
        }
        setDownloadedParts(newSet);
    };

    const handlePlayPart = async (track: typeof CEVSEN_AUDIO_TRACKS[0]) => {
        // If already playing this track, toggle
        if (currentTrack?.id === track.id) {
            await togglePlayPause();
            // Close modal after toggle? Or keep keep open? 
            // If checking status, maybe keep open. But usually toggle implies user wants to listen.
            return;
        }

        // Check availability
        const isDownloaded = downloadedParts.has(track.id) || await AudioDownloadService.checkFileExists(track.filename);

        if (!isDownloaded) {
            // Start Download
            setDownloadingPartId(track.id);
            setDownloadProgress(0);
            try {
                await AudioDownloadService.downloadFile(track.filename, (p) => setDownloadProgress(p));
                setDownloadedParts(prev => new Set(prev).add(track.id));
                setDownloadingPartId(null);

                // Auto play after download
                const localUri = AudioDownloadService.getLocalUri(track.filename);
                await playTrack({
                    id: track.id,
                    title: track.title,
                    source: { uri: localUri }
                });
            } catch (error) {
                console.error('Download failed', error);
                setDownloadingPartId(null);
                alert('İndirme başarısız oldu.');
            }
        } else {
            // Already downloaded, just play
            const localUri = AudioDownloadService.getLocalUri(track.filename);
            await playTrack({
                id: track.id,
                title: track.title,
                source: { uri: localUri }
            });
            setShowAudioModal(false);
        }
    };

    const handleResume = () => {
        navigation.navigate('Cevsen', { initialPage: lastPage > 0 ? lastPage : 1 });
    };

    const handleStartOver = () => {
        navigation.navigate('Cevsen', { initialPage: 1 });
    };

    const handleGoToPage = () => {
        const pageNum = parseInt(targetPageInput);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= CevsenPages.length) {
            setShowGoToPage(false);
            setTargetPageInput('');
            navigation.navigate('Cevsen', { initialPage: pageNum });
        }
    };

    // Check if any Cevşen audio is currently playing
    const currentCevsenTrack = CEVSEN_AUDIO_TRACKS.find(t => t.id === currentTrack?.id);
    const isCevsenPlaying = !!currentCevsenTrack && isPlaying;

    // ...

    return (
        <View style={styles.container}>
            {/* Headers and Main UI ... */}

            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={styles.headerBackground}>
                <LinearGradient
                    colors={[theme.colors.primary, '#0f766e']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.decorativeCircle} />
            </View>

            <View style={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
                {/* Header ... */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={28} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.headerTopContent}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="shield-checkmark" size={48} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.title}>Cevşenül Kebir</Text>
                            <Text style={styles.subtitle}>Manevi Zırhınız</Text>
                        </View>
                    </View>
                </View>

                {/* Main Content Card (White area) */}
                <View style={styles.cardContent}>
                    <View style={styles.quoteContainer}>
                        <Text style={styles.quoteText}>
                            "Bu dua, o zırhtan daha büyüktür ve seni daha fazla korur."
                        </Text>
                        <Text style={styles.quoteSource}>- Hadis-i Şerif Meali</Text>
                    </View>

                    {/* Actions Section */}
                    <View style={styles.actions}>
                        {/* Resume Button */}
                        <TouchableOpacity
                            style={styles.resumeButton}
                            activeOpacity={0.9}
                            onPress={handleResume}
                        >
                            <LinearGradient
                                colors={[theme.colors.secondary, '#b45309']}
                                style={styles.resumeGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <View style={styles.resumeContent}>
                                    <Text style={styles.resumeTitle}>Kaldığın Yerden Devam Et</Text>
                                    <View style={styles.resumeSubtitleContainer}>
                                        <Ionicons name="bookmark" size={14} color="rgba(255,255,255,0.9)" />
                                        <Text style={styles.resumeSubtitle}>Son okunan: Sayfa {lastPage}</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward-circle" size={32} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Secondary Actions Row */}
                        <View style={styles.secondaryActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => setShowGoToPage(true)}
                            >
                                <View style={[styles.actionIconBg, { backgroundColor: '#f0fdf9' }]}>
                                    <Ionicons name="apps" size={24} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.actionText}>Sayfaya Git</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleStartOver}
                            >
                                <View style={[styles.actionIconBg, { backgroundColor: '#f0fdf9' }]}>
                                    <Ionicons name="refresh" size={24} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.actionText}>Baştan Başla</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => isCevsenPlaying ? togglePlayPause() : setShowAudioModal(true)}
                            >
                                <View style={[styles.actionIconBg, { backgroundColor: isCevsenPlaying ? '#fef3c7' : '#f0fdf9' }]}>
                                    <Ionicons
                                        name={isCevsenPlaying ? "pause" : "headset"}
                                        size={24}
                                        color={isCevsenPlaying ? '#d97706' : theme.colors.primary}
                                    />
                                </View>
                                <Text style={styles.actionText}>{isCevsenPlaying ? 'Durdur' : 'Sesli Dinle'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Go To Page Modal ... */}
            <Modal
                visible={showGoToPage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowGoToPage(false)}
            >
                {/* ... existing modal content ... */}
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowGoToPage(false)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Sayfaya Git</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Sayfa No"
                            keyboardType="number-pad"
                            autoFocus={true}
                            value={targetPageInput}
                            onChangeText={setTargetPageInput}
                            onSubmitEditing={handleGoToPage}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setShowGoToPage(false)}>
                                <Text style={styles.modalButtonTextCancel}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleGoToPage}>
                                <Text style={styles.modalButtonTextConfirm}>Git</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Audio Part Selection Modal */}
            <Modal
                visible={showAudioModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAudioModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowAudioModal(false)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Cevşen Parçası Seçin</Text>
                        <View style={styles.audioPartList}>
                            {CEVSEN_AUDIO_TRACKS.map((track) => {
                                const isThisTrackPlaying = currentTrack?.id === track.id && isPlaying;
                                const isDownloadingThis = downloadingPartId === track.id;
                                const isDownloaded = downloadedParts.has(track.id);

                                return (
                                    <TouchableOpacity
                                        key={track.id}
                                        style={[
                                            styles.audioPartButton,
                                            isThisTrackPlaying && styles.audioPartButtonActive
                                        ]}
                                        onPress={() => !isDownloadingThis && handlePlayPart(track)}
                                        disabled={isDownloadingThis}
                                    >
                                        {/* Icon: Play / Pause / Download / Loading */}
                                        {isDownloadingThis ? (
                                            <ActivityIndicator color={theme.colors.primary} size="small" />
                                        ) : (
                                            <Ionicons
                                                name={isThisTrackPlaying ? "pause-circle" : (isDownloaded ? "play-circle" : "cloud-download-outline")}
                                                size={28}
                                                color={isThisTrackPlaying ? '#fff' : theme.colors.primary}
                                            />
                                        )}

                                        <View style={{ flex: 1 }}>
                                            <Text style={[
                                                styles.audioPartText,
                                                isThisTrackPlaying && styles.audioPartTextActive
                                            ]}>{track.title}</Text>

                                            {/* Progress Info */}
                                            {isDownloadingThis && (
                                                <Text style={{ fontSize: 10, color: theme.colors.primary }}>
                                                    İndiriliyor %{(downloadProgress * 100).toFixed(0)}
                                                </Text>
                                            )}
                                        </View>

                                        {!isDownloaded && !isDownloadingThis && (
                                            <Text style={{ fontSize: 10, color: '#94a3b8' }}>İndir</Text>
                                        )}

                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity
                            style={styles.modalButtonCancel}
                            onPress={() => setShowAudioModal(false)}
                        >
                            <Text style={styles.modalButtonTextCancel}>Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerBackground: {
        height: '45%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    decorativeCircle: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(255,255,255,0.1)',
        transform: [{ scale: 1.5 }],
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        marginBottom: 20,
    },
    headerTopContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
        letterSpacing: 0.5,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: 2,
        textTransform: 'uppercase',
        fontWeight: '600'
    },
    cardContent: {
        flex: 1,
        marginTop: 40,
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingTop: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    quoteContainer: {
        marginBottom: 40,
    },
    quoteText: {
        color: '#334155',
        fontSize: 18,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 28,
        fontWeight: '500'
    },
    quoteSource: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    actions: {
        width: '100%',
        gap: 16,
    },
    resumeButton: {
        width: '100%',
        height: 80,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    resumeGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
    resumeContent: {
        flex: 1,
    },
    resumeTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6
    },
    resumeSubtitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    resumeSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '500'
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: 16,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    actionIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12
    },
    actionText: {
        color: '#475569',
        fontWeight: '700',
        fontSize: 14
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '85%',
        padding: 24,
        borderRadius: 20,
        elevation: 10,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 24,
        color: '#0f172a'
    },
    modalInput: {
        width: '100%',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 20,
        marginBottom: 24,
        textAlign: 'center',
        color: '#0f172a',
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 16
    },
    modalButtonCancel: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center'
    },
    modalButtonConfirm: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2
    },
    modalButtonTextCancel: {
        color: '#64748b',
        fontWeight: 'bold',
        fontSize: 16
    },
    modalButtonTextConfirm: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    // Audio Part Selection Modal Styles
    audioPartList: {
        width: '100%',
        gap: 12,
        marginBottom: 20,
    },
    audioPartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f0fdf9',
        borderRadius: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    audioPartButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    audioPartText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    audioPartTextActive: {
        color: '#fff',
    },
});
