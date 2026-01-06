import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ProgressBarAndroid, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '@/context/AudioContext';
import { theme } from '@/config/theme';
import { useNavigation } from '@react-navigation/native';

export const MiniPlayer = () => {
    const { currentTrack, isPlaying, togglePlayPause, stop, position, duration } = useAudio();
    const navigation = useNavigation<any>();

    if (!currentTrack) return null;

    const progress = duration > 0 ? position / duration : 0;

    const handlePress = () => {
        // Navigate to full player screen if possible
    };

    return (
        <View style={styles.container}>
            {/* Progress Bar (Top Border) */}
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
            </View>

            <View style={styles.content}>
                <TouchableOpacity style={styles.infoContainer} onPress={handlePress} activeOpacity={0.8}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="musical-note" size={20} color="#fff" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
                        <Text style={styles.subtitle}>Oynatılıyor...</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.controls}>
                    <TouchableOpacity onPress={togglePlayPause} style={styles.controlButton}>
                        <Ionicons name={isPlaying ? "pause" : "play"} size={28} color={theme.colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={stop} style={styles.controlButton}>
                        <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 90 : 70, // Above tab bar
        left: 10,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
    },
    progressBarBg: {
        height: 2,
        backgroundColor: '#f1f5f9',
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        paddingHorizontal: 16,
    },
    infoContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 11,
        color: '#64748b',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    controlButton: {
        padding: 4,
    }
});
