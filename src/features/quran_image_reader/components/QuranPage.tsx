import React from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';

interface Props {
    uri: string;
    pageNumber: number;
}

export const QuranPage: React.FC<Props> = React.memo(({ uri, pageNumber }) => {
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);
    const [retryKey, setRetryKey] = React.useState(0);

    return (
        <View style={styles.container}>
            {loading && (
                <View style={[StyleSheet.absoluteFill, styles.centered]}>
                    <ActivityIndicator size="large" color="#4B5563" />
                </View>
            )}

            <Image
                key={`${uri}-${retryKey}`}
                source={{ uri }}
                style={styles.image}
                resizeMode="contain"
                onLoadStart={() => {
                    setLoading(true);
                    setError(false);
                }}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                    setLoading(false);
                    setError(true);
                }}
            />

            {error && (
                <View style={[StyleSheet.absoluteFill, styles.centered, styles.errorOverlay]}>
                    <Text style={styles.errorText}>Sayfa {pageNumber} yüklenemedi</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => setRetryKey(prev => prev + 1)}
                    >
                        <Text style={styles.retryText}>Yeniden Dene</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.pageLabel}>
                <Text style={styles.labelText}>Sayfa {pageNumber}</Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#F3F4F6',
        aspectRatio: 0.7,
        overflow: 'hidden', // Contain zoom within page area
    },
    imageContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    errorOverlay: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    retryButton: {
        backgroundColor: '#4B5563',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    retryText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    pageLabel: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    labelText: {
        color: '#FFFFFF',
        fontSize: 10,
    }
});
