import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Image } from 'expo-image';
import { QuranPackService } from '../services/QuranPackService';
import * as FileSystem from 'expo-file-system';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';

interface QuranPageItemProps {
    pageNumber: number;
    width: number;
    height: number;
}

const QuranPageItem = React.memo(({ pageNumber, width, height }: QuranPageItemProps) => {
    const [source, setSource] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            const uri = QuranPackService.getPageUri(pageNumber);
            if (!uri) {
                if (isMounted) setStatus('error');
                return;
            }
            const info = await FileSystem.getInfoAsync(uri);
            if (info.exists && isMounted) {
                setSource(uri);
                setStatus('ready');
            } else if (isMounted) {
                setStatus('error');
            }
        };
        load();
        return () => { isMounted = false; };
    }, [pageNumber]);

    if (status === 'error') {
        return (
            <View style={[styles.container, { width, height, backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontWeight: 'bold', marginTop: 8 }}>Sayfa {pageNumber} Yok</Text>
            </View>
        );
    }

    if (status === 'loading') {
        return (
            <View style={[styles.container, { width, height, backgroundColor: '#EDD9BF' }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ width, height, overflow: 'hidden', backgroundColor: '#EDD9BF' }}>
            <Image
                source={{ uri: source! }}
                style={{ flex: 1, width: '100%', height: '100%' }}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
            />
            {/* Small Page Number Overlay for Reference if needed */}
            <Text style={styles.pageNumber}>{pageNumber}</Text>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageNumber: {
        position: 'absolute',
        bottom: 4,
        alignSelf: 'center',
        fontSize: 10,
        color: '#8B7355',
        backgroundColor: 'rgba(237,217,191,0.85)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        zIndex: 10
    }
});

export default QuranPageItem;
