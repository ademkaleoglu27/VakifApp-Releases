import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Fail-fast error screen shown when meta schema version is incompatible.
 * This is a minimal screen that doesn't depend on Reader theming.
 */
export const IncompatibleDataScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>Veri Paketi Uyumsuz</Text>
            <Text style={styles.message}>
                İçerik verisi bu uygulama sürümüyle uyumlu değil.
                Lütfen uygulamayı güncelleyin.
            </Text>
            <Text style={styles.hint}>
                Hata kodu: SCHEMA_VERSION_MISMATCH
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
        padding: 24,
    },
    icon: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#e94560',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#eee',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    hint: {
        fontSize: 12,
        color: '#888',
        fontFamily: 'monospace',
    },
});
