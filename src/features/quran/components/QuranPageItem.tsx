import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { QuranPackService } from '../services/QuranPackService';
import { QURAN_PAGES_HQ } from '@/config/quranPagesHQ';
import { Ionicons } from '@expo/vector-icons';

interface QuranPageItemProps {
    pageNumber: number;
    width: number;
    height: number;
}

const QuranPageItem = React.memo(({ pageNumber, width, height }: QuranPageItemProps) => {
    const [hasError, setHasError] = useState(false);

    // Prefer bundled high-quality asset if available, fallback to pack URI
    const source = useMemo(() => {
        if (QURAN_PAGES_HQ[pageNumber]) {
            return QURAN_PAGES_HQ[pageNumber];
        }
        const uri = QuranPackService.getPageUri(pageNumber);
        return uri ? { uri } : null;
    }, [pageNumber]);

    if (hasError || !source) {
        return (
            <View style={[styles.container, { width, height, backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontWeight: 'bold', marginTop: 8 }}>Sayfa {pageNumber} Yüklenemedi</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { width, height, overflow: 'hidden', backgroundColor: '#FAF6EE' }]}>
            <Image
                source={source}
                style={styles.image}
                contentFit="contain"
                recyclingKey={`quran-p-${pageNumber}`}
                priority="high"
                cachePolicy="memory-disk"
                onError={() => setHasError(true)}
            />
            {/* Page Number Overlay */}
            <Text style={styles.pageNumber}>{pageNumber}</Text>
        </View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.pageNumber === nextProps.pageNumber &&
        prevProps.width === nextProps.width &&
        prevProps.height === nextProps.height
    );
});

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    pageNumber: {
        position: 'absolute',
        bottom: 6,
        alignSelf: 'center',
        fontSize: 11,
        fontWeight: 'bold',
        color: '#8B7355',
        backgroundColor: 'rgba(250,246,238,0.92)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2D9C8',
        zIndex: 10,
    },
});

export default QuranPageItem;
