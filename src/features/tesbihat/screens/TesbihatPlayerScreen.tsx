import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { PremiumHeader } from '@/components/PremiumHeader';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { TesbihatTrack } from '../data/tesbihatData';
import { useAudio } from '@/context/AudioContext';
import { AudioDownloadService } from '@/services/audioDownloadService';

export const TesbihatPlayerScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const params = route.params || {};
    const title = params.title || 'Tesbihat';
    const tracks: TesbihatTrack[] = params.tracks || [];

    // Local index state for playlist navigation
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

    // Download States
    const [fileExists, setFileExists] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const {
        playTrack,
        togglePlayPause,
        currentTrack,
        isPlaying,
        isLoading,
        position,
        duration
    } = useAudio();

    const activeTrack = tracks[currentTrackIndex];

    // Check if the global current track matches one in our list 
    useEffect(() => {
        if (currentTrack) {
            const index = tracks.findIndex((t) => t.id === currentTrack.id);
            if (index !== -1) {
                setCurrentTrackIndex(index);
            }
        }
    }, [currentTrack]);

    // Check file existence when active track changes
    useEffect(() => {
        checkFileStatus();
    }, [activeTrack]);

    const checkFileStatus = async () => {
        if (!activeTrack) return;
        const exists = await AudioDownloadService.checkFileExists(activeTrack.filename);
        setFileExists(exists);
    };

    const handleDownload = async () => {
        if (!activeTrack) return;

        setIsDownloading(true);
        setDownloadProgress(0);
        try {
            await AudioDownloadService.downloadFile(activeTrack.filename, (progress) => {
                setDownloadProgress(progress);
            });
            setFileExists(true);
            // Auto play after download? Maybe better to let user press play.
        } catch (error) {
            Alert.alert('Hata', 'İndirme başarısız oldu. İnternet bağlantınızı kontrol edin.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePlayCurrent = async () => {
        if (!fileExists) {
            handleDownload();
            return;
        }

        const localUri = AudioDownloadService.getLocalUri(activeTrack.filename);

        // If global track is this one, toggle
        if (currentTrack?.id === activeTrack.id) {
            await togglePlayPause();
        } else {
            // Start new track
            // AudioContext expects source: { uri: ... } or require(...)
            // We construct metadata object that matches Track interface
            await playTrack({
                id: activeTrack.id,
                title: activeTrack.title,
                source: { uri: localUri }
            });
        }
    };

    const playNext = async () => {
        if (currentTrackIndex < tracks.length - 1) {
            const nextIndex = currentTrackIndex + 1;
            setCurrentTrackIndex(nextIndex);
            // Note: Next track might not be downloaded. 
            // The file check effect will trigger and button will turn to download.
        }
    };

    const playPrevious = async () => {
        if (currentTrackIndex > 0) {
            const prevIndex = currentTrackIndex - 1;
            setCurrentTrackIndex(prevIndex);
        }
    };

    const formatTime = (millis: number) => {
        if (!millis) return '0:00';
        const minutes = Math.floor(millis / 60000);
        const seconds = ((millis % 60000) / 1000).toFixed(0);
        return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
    };

    const getProgress = () => {
        if (currentTrack?.id !== activeTrack.id) return 0;
        if (!duration) return 0;
        return position / duration;
    };

    const isCurrentPlaying = isPlaying && currentTrack?.id === activeTrack.id;
    const isCurrentLoading = isLoading && currentTrack?.id === activeTrack.id;

    return (
        <View style={styles.container}>
            <PremiumHeader title={title} backButton />

            <View style={styles.content}>
                {/* Track Info */}
                <View style={styles.trackInfo}>
                    <Ionicons name="musical-note" size={64} color={theme.colors.primary} />
                    <Text style={styles.trackTitle}>{activeTrack.title}</Text>
                    <Text style={styles.playlistInfo}>{currentTrackIndex + 1} / {tracks.length}</Text>

                    {/* Status Text (Downloaded/Not) */}
                    <Text style={[styles.statusText, { color: fileExists ? '#10b981' : '#f59e0b' }]}>
                        {isDownloading ? `İndiriliyor %${(downloadProgress * 100).toFixed(0)}` :
                            fileExists ? 'Cihazda Mevcut' : 'İndirilmemiş (Bulutta)'}
                    </Text>

                    {/* Read Button */}
                    {route.params.pdfSource && (
                        <TouchableOpacity
                            style={styles.readButton}
                            onPress={() => navigation.navigate('RisalePdfReader', {
                                title: title + ' Okuma',
                                uri: '',
                                assetSource: route.params.pdfSource
                            })}
                        >
                            <Ionicons name="book-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.readButtonText}>Metni Oku</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
                    </View>
                    <View style={styles.timeRow}>
                        <Text style={styles.timeText}>{currentTrack?.id === activeTrack.id ? formatTime(position) : '0:00'}</Text>
                        <Text style={styles.timeText}>{currentTrack?.id === activeTrack.id ? formatTime(duration) : '0:00'}</Text>
                    </View>
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity onPress={playPrevious} disabled={currentTrackIndex === 0}>
                        <Ionicons name="play-skip-back" size={32} color={currentTrackIndex === 0 ? '#cbd5e1' : theme.colors.primary} />
                    </TouchableOpacity>

                    {/* Main Action Button: Play/Pause or Download */}
                    <TouchableOpacity
                        onPress={handlePlayCurrent}
                        style={[styles.playBtn, (isDownloading || isCurrentLoading) && { opacity: 0.8 }]}
                        disabled={isDownloading || isCurrentLoading}
                    >
                        {isDownloading ? (
                            <ActivityIndicator color="#fff" />
                        ) : !fileExists ? (
                            <Ionicons name="cloud-download-outline" size={36} color="#fff" />
                        ) : isCurrentLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Ionicons name={isCurrentPlaying ? "pause" : "play"} size={40} color="#fff" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={playNext} disabled={currentTrackIndex === tracks.length - 1}>
                        <Ionicons name="play-skip-forward" size={32} color={currentTrackIndex === tracks.length - 1 ? '#cbd5e1' : theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Download Hint Text */}
                {!fileExists && !isDownloading && (
                    <Text style={{ textAlign: 'center', color: theme.colors.primary, marginTop: 16, fontSize: 14, fontWeight: '600' }}>
                        📥 İNDİR: {activeTrack.title}
                    </Text>
                )}

                {/* Upcoming List */}
                <View style={styles.upcomingList}>
                    <Text style={styles.upcomingTitle}>Parça Listesi</Text>
                    {tracks.map((track, index) => (
                        <TouchableOpacity
                            key={track.id}
                            style={[
                                styles.trackItem,
                                index === currentTrackIndex && styles.activeTrackItem
                            ]}
                            onPress={() => setCurrentTrackIndex(index)}
                        >
                            <Ionicons
                                name={index === currentTrackIndex ? "volume-high" : "musical-note-outline"}
                                size={20}
                                color={index === currentTrackIndex ? theme.colors.primary : '#64748b'}
                            />
                            <Text style={[
                                styles.trackItemText,
                                index === currentTrackIndex && styles.activeTrackItemText
                            ]}>
                                {track.title}
                            </Text>
                            {/* Playing indicator in list */}
                            {currentTrack?.id === track.id && isPlaying && (
                                <View style={styles.playingIndicator}>
                                    <Ionicons name="bar-chart" size={16} color={theme.colors.primary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { flex: 1, padding: 24, alignItems: 'center' },
    trackInfo: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
    trackTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginTop: 16, textAlign: 'center' },
    playlistInfo: { fontSize: 14, color: '#64748b', marginTop: 8 },
    statusText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
    readButton: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#e0f2fe', paddingVertical: 8, paddingHorizontal: 16,
        borderRadius: 20, marginTop: 16
    },
    readButtonText: { color: theme.colors.primary, fontWeight: '600' },

    progressContainer: { width: '100%', marginBottom: 30 },
    progressBar: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: theme.colors.primary },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    timeText: { fontSize: 12, color: '#64748b' },

    controls: { flexDirection: 'row', alignItems: 'center', gap: 32, marginBottom: 30 },
    playBtn: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: theme.colors.primary,
        alignItems: 'center', justifyContent: 'center',
        elevation: 8, shadowColor: theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 12
    },

    upcomingList: { width: '100%', alignSelf: 'stretch', flex: 1 },
    upcomingTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
    trackItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: '#fff', gap: 12 },
    activeTrackItem: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' },
    trackItemText: { fontSize: 14, color: '#475569', flex: 1 },
    activeTrackItemText: { color: theme.colors.primary, fontWeight: '600' },
    playingIndicator: { marginLeft: 'auto' }
});
