import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, Text, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const HATIM_IMAGES = [
    require('../../../../assets/prayers/hatim_1.jpg'),
    require('../../../../assets/prayers/hatim_2.jpg'),
    require('../../../../assets/prayers/hatim_3.jpg'),
];

export const HatimDuasiScreen = () => {
    // const insets = useSafeAreaInsets(); // Removed insets padding for headerArea since it handles padding internally similar to PremiumHeader
    const navigation = useNavigation();
    const [zoomLevel, setZoomLevel] = useState(1.0);

    const handleZoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 0.25, 3.0));
    };

    const handleZoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 0.25, 1.0));
    };

    const scaledWidth = (width - 32) * zoomLevel;
    const scaledHeight = scaledWidth * 1.41; // Aspect ratio

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Custom Premium Header with Zoom Controls */}
            <View style={[styles.headerArea, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
                <View style={styles.topRow}>
                    <View style={styles.leftContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Hatim Duası</Text>
                    </View>

                    <View style={styles.controlsContainer}>
                        <TouchableOpacity onPress={handleZoomOut} style={[styles.iconButton, { marginRight: 8 }]}>
                            <Ionicons name="remove" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleZoomIn} style={styles.iconButton}>
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Content */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                horizontal={true}
                showsHorizontalScrollIndicator={true}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ width: Math.max(width, scaledWidth + 32) }}
                    scrollEnabled={true} // Enable vertical scroll
                >
                    <View style={{ padding: 16, alignItems: 'center' }}>
                        {HATIM_IMAGES.map((img, index) => (
                            <View key={index} style={[styles.pageContainer, { width: scaledWidth, height: scaledHeight }]}>
                                <Image
                                    source={img}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="contain"
                                />
                                <View style={styles.pageNumberBadge}>
                                    <Text style={styles.pageNumberText}>{index + 1}</Text>
                                </View>
                            </View>
                        ))}
                        <View style={{ height: 100 }} />
                    </View>
                </ScrollView>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerArea: {
        backgroundColor: theme.colors.primary,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
        zIndex: 10
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    controlsContainer: {
        flexDirection: 'row',
    },
    iconButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    scrollContent: {
        flexGrow: 1,
    },
    pageContainer: {
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
        position: 'relative'
    },
    pageNumberBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    pageNumberText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    }
});
