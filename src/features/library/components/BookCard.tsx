// BookCard.tsx - Premium book card with 3D shadow effect
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LibraryItem } from '../catalog/LibraryCatalog';

interface BookCardProps {
    item: LibraryItem;
    size?: 'large' | 'medium' | 'small';
    onPress: (item: LibraryItem) => void;
}

// Placeholder cover colors based on kind
const COVER_COLORS: Record<string, string> = {
    quran: '#8B4513',      // Brown leather
    cevsen: '#8B0000',     // Dark red
    lugat: '#2F4F4F',      // Dark slate
    big: '#1e3a5f',        // Navy blue
    small: '#D4A5A5',      // Dusty rose
    html_dev: '#4a5568',   // Gray
    other: '#64748b'       // Slate
};

const COVER_DIMENSIONS = {
    large: { width: 200, height: 280 },
    medium: { width: 120, height: 170 },
    small: { width: 100, height: 140 }
};

export const BookCard = React.memo(({ item, size = 'medium', onPress }: BookCardProps) => {
    const dimensions = COVER_DIMENSIONS[size];
    const coverColor = COVER_COLORS[item.kind] || COVER_COLORS.other;

    const isPreparing = item.status === 'preparing';

    return (
        <TouchableOpacity
            style={[styles.container, { width: dimensions.width }]}
            onPress={() => onPress(item)}
            activeOpacity={0.8}
        >
            {/* Book Cover */}
            <View style={[
                styles.cover,
                {
                    width: dimensions.width,
                    height: dimensions.height,
                    backgroundColor: coverColor
                }
            ]}>
                {/* Decorative frame */}
                <View style={styles.frame}>
                    <View style={styles.innerFrame} />
                </View>

                {/* Title on cover */}
                <View style={styles.titleContainer}>
                    <Text style={[
                        styles.coverTitle,
                        size === 'large' && styles.coverTitleLarge
                    ]} numberOfLines={3}>
                        {item.title}
                    </Text>
                </View>

                {/* Preparing overlay */}
                {isPreparing && (
                    <View style={styles.preparingOverlay}>
                        <Ionicons name="cloud-download-outline" size={32} color="#fff" />
                    </View>
                )}

                {/* 3D spine effect */}
                <View style={styles.spine} />
            </View>

            {/* Subtitle below */}
            {item.subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                    {item.subtitle}
                </Text>
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        marginRight: 16,
        alignItems: 'center'
    },
    cover: {
        borderRadius: 8,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        // 3D shadow
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10
    },
    frame: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        bottom: 12,
        borderWidth: 2,
        borderColor: 'rgba(212, 175, 55, 0.6)',
        borderRadius: 4
    },
    innerFrame: {
        position: 'absolute',
        top: 6,
        left: 6,
        right: 6,
        bottom: 6,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
        borderRadius: 2
    },
    titleContainer: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    coverTitle: {
        color: '#D4AF37',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        fontFamily: 'serif',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2
    },
    coverTitleLarge: {
        fontSize: 22,
        lineHeight: 28
    },
    preparingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    spine: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 8,
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    subtitle: {
        marginTop: 8,
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center'
    }
});
