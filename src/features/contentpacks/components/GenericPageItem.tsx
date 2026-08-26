
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { ContentPackService } from '../services/ContentPackService';

interface GenericPageItemProps {
    pageNumber: number;
    width: number;
    height: number;
    service: ContentPackService;
}

const GenericPageItem = React.memo(({ pageNumber, width, height, service }: GenericPageItemProps) => {
    const [source, setSource] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            const uri = service.getPageUri(pageNumber);
            if (!uri) {
                if (isMounted) setStatus('error');
                return;
            }
            // Add file:// prefix if missing for FileSystem check
            const checkUri = uri.startsWith('file://') ? uri : 'file://' + uri;

            const info = await FileSystem.getInfoAsync(checkUri);
            if (info.exists && isMounted) {
                setSource(checkUri);
                setStatus('ready');
            } else if (isMounted) {
                setStatus('error');
            }
        };
        load();
        return () => { isMounted = false; };
    }, [pageNumber, service]);

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
            <View style={[styles.container, { width, height, backgroundColor: '#FFF8F0' }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ width, height, overflow: 'hidden' }}>
            <Image
                source={{ uri: source! }}
                style={{ flex: 1, width: '100%', height: '100%' }}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
            />
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
        bottom: 2,
        alignSelf: 'center',
        fontSize: 10,
        color: '#94A3B8',
        backgroundColor: 'rgba(255,255,255,0.7)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    }
});

export default GenericPageItem;
