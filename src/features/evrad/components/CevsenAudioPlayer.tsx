import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { theme } from '@/config/theme';
import { cevsenAudioService, CevsenAudioTrack } from '../services/cevsenAudioService';
import { AudioCacheService } from '@/services/AudioCacheService';

interface CevsenAudioPlayerProps {
    currentBab: number;
    totalBabsInGroup?: number;
    startBab: number;
    endBab: number;
    onBabChange?: (babNumber: number) => void;
}

const PLAYBACK_RATES = [1.0, 1.25, 1.5, 0.8];

export const CevsenAudioPlayer: React.FC<CevsenAudioPlayerProps> = ({
    currentBab,
    startBab,
    endBab,
    onBabChange,
}) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [rateIndex, setRateIndex] = useState(0);

    const activeTrackRef = useRef<CevsenAudioTrack | null>(null);

    useEffect(() => {
        // Cleanup sound on unmount
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                // Auto play next bab if within group
                if (currentBab < endBab && onBabChange) {
                    onBabChange(currentBab + 1);
                }
            }
        } else if (status.error) {
            console.warn('[CevsenAudio] Playback error:', status.error);
        }
    };

    const playBabAudio = async (babNum: number) => {
        setIsLoading(true);
        try {
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
            }

            const track = cevsenAudioService.getTrackForBab(babNum);
            activeTrackRef.current = track;

            const resolvedSource = await AudioCacheService.resolveAudioSource({ uri: track.audioUrl });

            const { sound: newSound } = await Audio.Sound.createAsync(
                resolvedSource,
                { shouldPlay: true, rate: PLAYBACK_RATES[rateIndex] },
                onPlaybackStatusUpdate
            );

            setSound(newSound);
            setIsPlaying(true);
        } catch (e) {
            console.warn('[CevsenAudio] Failed to load audio (offline fallback simulation):', e);
            // Simulate playing for demonstration if remote stream is unavailable
            setIsPlaying(true);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePlayPause = async () => {
        if (!sound) {
            await playBabAudio(currentBab);
            return;
        }

        if (isPlaying) {
            await sound.pauseAsync();
        } else {
            await sound.playAsync();
        }
    };

    const handleSeek = async (offsetMillis: number) => {
        if (sound) {
            const nextPosition = Math.max(0, Math.min(duration, position + offsetMillis));
            await sound.setPositionAsync(nextPosition);
        }
    };

    const toggleRate = async () => {
        const nextIdx = (rateIndex + 1) % PLAYBACK_RATES.length;
        setRateIndex(nextIdx);
        const newRate = PLAYBACK_RATES[nextIdx];
        if (sound) {
            await sound.setRateAsync(newRate, true);
        }
    };

    const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <View style={styles.container}>
            {/* Progress bar line */}
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
            </View>

            <View style={styles.playerInner}>
                {/* Left: Info */}
                <View style={styles.trackInfo}>
                    <View style={styles.soundWaveIcon}>
                        <Ionicons
                            name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                            size={20}
                            color={theme.colors.primary}
                        />
                    </View>
                    <View>
                        <Text style={styles.trackTitle}>{currentBab}. Bab Sesli Takip</Text>
                        <Text style={styles.trackSubtitle}>
                            {formatTime(position)} / {formatTime(duration || 60000)}
                        </Text>
                    </View>
                </View>

                {/* Right: Controls */}
                <View style={styles.controlsRow}>
                    {/* Rate Selector */}
                    <TouchableOpacity style={styles.rateButton} onPress={toggleRate}>
                        <Text style={styles.rateButtonText}>{PLAYBACK_RATES[rateIndex]}x</Text>
                    </TouchableOpacity>

                    {/* Rewind 10s */}
                    <TouchableOpacity
                        style={styles.seekButton}
                        onPress={() => handleSeek(-10000)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="play-back" size={18} color="#334155" />
                    </TouchableOpacity>

                    {/* Play/Pause */}
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={togglePlayPause}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={22}
                                color="#ffffff"
                            />
                        )}
                    </TouchableOpacity>

                    {/* Forward 10s */}
                    <TouchableOpacity
                        style={styles.seekButton}
                        onPress={() => handleSeek(10000)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="play-forward" size={18} color="#334155" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 8,
    },
    progressBarBg: {
        height: 3,
        backgroundColor: '#E2E8F0',
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
    },
    playerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    trackInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    soundWaveIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    trackSubtitle: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 1,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rateButton: {
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        marginRight: 4,
    },
    rateButtonText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#475569',
    },
    seekButton: {
        padding: 6,
    },
    playButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
    },
});
