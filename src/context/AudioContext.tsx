import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export interface Track {
    id: string | number;
    title: string;
    source: any; // require('./path') or { uri: '...' }
    // Add other metadata if needed
}

interface AudioContextType {
    currentTrack: Track | null;
    sound: Audio.Sound | null;
    isPlaying: boolean;
    isLoading: boolean;
    duration: number;
    position: number;
    playTrack: (track: Track) => Promise<void>;
    togglePlayPause: () => Promise<void>;
    stop: () => Promise<void>;
    seekTo: (millis: number) => Promise<void>;
}

const AudioContext = createContext<AudioContextType>({
    currentTrack: null,
    sound: null,
    isPlaying: false,
    isLoading: false,
    duration: 0,
    position: 0,
    playTrack: async () => { },
    togglePlayPause: async () => { },
    stop: async () => { },
    seekTo: async () => { },
});

export const useAudio = () => useContext(AudioContext);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);

    const isUnmounting = useRef(false);

    useEffect(() => {
        // Prepare audio mode for background (iOS requirement mainly, but good for Android too)
        Audio.setAudioModeAsync({
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false
        }).catch(err => console.warn('Audio mode setup error', err));

        return () => {
            isUnmounting.current = true;
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, []);

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                // Optionally auto-play next here if playlist logic is moved to context
            }
        } else if (status.error) {
            console.warn(`Playback Error: ${status.error}`);
        }
    };

    const playTrack = async (track: Track) => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            // Unload existing
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                track.source,
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );

            setSound(newSound);
            setCurrentTrack(track);
            setIsPlaying(true);
        } catch (error) {
            console.error('Failed to play track', error);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePlayPause = async () => {
        if (!sound) return;

        if (isPlaying) {
            await sound.pauseAsync();
        } else {
            await sound.playAsync();
        }
    };

    const stop = async () => {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
            setCurrentTrack(null);
            setIsPlaying(false);
            setPosition(0);
            setDuration(0);
        }
    };

    const seekTo = async (millis: number) => {
        if (sound) {
            await sound.setPositionAsync(millis);
        }
    };

    return (
        <AudioContext.Provider value={{
            currentTrack,
            sound,
            isPlaying,
            isLoading,
            duration,
            position,
            playTrack,
            togglePlayPause,
            stop,
            seekTo
        }}>
            {children}
        </AudioContext.Provider>
    );
};
