import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Animated, Dimensions, Vibration, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// --- TYPES ---
interface TesbihatSection {
    id: string;
    title: string;
    content: { type: 'arabic' | 'latin'; text: string; meta?: any }[];
}

interface TesbihatBook {
    title: string;
    sections: TesbihatSection[];
}


// --- COMPONENTS ---

/**
 * Interactive Counter Button (Zakir Style)
 * Renders a large touchable area that increments a count.
 */
const ZakirCounter = ({ target = 33, onChange }: { target?: number, onChange?: (val: number) => void }) => {
    const [count, setCount] = useState(0);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        // Haptic feedback
        Vibration.vibrate(10);

        // Animation
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.95, duration: 50, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        const newCount = count + 1;
        setCount(newCount);
        onChange?.(newCount);

        // Completion feedback
        if (newCount % target === 0) {
            Vibration.vibrate([0, 50, 50, 50]); // Success pattern
        }
    };

    const reset = () => {
        setCount(0);
        onChange?.(0);
    };

    const progress = Math.min(count / target, 1);

    return (
        <View style={styles.counterContainer}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePress}
                onLongPress={reset}
            >
                <Animated.View style={[
                    styles.counterButton,
                    { transform: [{ scale: scaleAnim }] },
                    count >= target && styles.counterButtonComplete
                ]}>
                    <View style={styles.counterRing}>
                        {/* Simple progress ring could go here */}
                    </View>
                    <Text style={[styles.counterText, count >= target && styles.counterTextComplete]}>
                        {count}
                    </Text>
                    <Text style={[styles.counterLabel, count >= target && styles.counterLabelComplete]}>
                        / {target}
                    </Text>
                </Animated.View>
            </TouchableOpacity>
            <Text style={styles.counterHint}>Sıfırlamak için basılı tutun</Text>
        </View>
    );
};

/**
 * Reading Modal for Long Texts (Dialog Style)
 */
const ReadingModal = ({ visible, onClose, section }: { visible: boolean; onClose: () => void; section: TesbihatSection | null }) => {
    if (!section) return null;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{section.title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.colors.onSurfaceVariant} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        {section.content.map((seg, idx) => (
                            <View key={idx} style={[styles.segment, seg.type === 'arabic' ? styles.segmentArabic : styles.segmentLatin]}>
                                <Text style={[
                                    seg.type === 'arabic' ? styles.textArabic : styles.textLatin,
                                    seg.type === 'arabic' && { color: theme.colors.primary }
                                ]}>
                                    {seg.text}
                                </Text>
                            </View>
                        ))}
                        {/* Footer Spacer */}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};


// --- MAIN SCREEN ---

export const TesbihatScreen = () => {
    const navigation = useNavigation();
    const [book, setBook] = useState<TesbihatBook | null>(null);
    const [modalSection, setModalSection] = useState<TesbihatSection | null>(null);

    // List of sections that should behave as counters
    // In a real app, this should be in the JSON metadata
    const COUNTER_SECTIONS = ['subhanallahi', 'elhamdulillah', 'allahuekber', 'tesbih'];

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        try {
            // Fix: require() returns the JSON object directly, no need for Asset.fromModule
            const data = require('../../../../assets/books/tesbihat.json');
            setBook(data);
        } catch (e) {
            console.error('Failed to load Tesbihat:', e);
        }
    };

    const handleItemPress = (item: TesbihatSection) => {
        // Feature is locked for now
        // setModalSection(item);
    };

    const renderCard = ({ item, index }: { item: TesbihatSection; index: number }) => {
        // ... (this is kept for code integrity but not rendered in this version)
        return null;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Premium Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>TESBİHAT</Text>
                    <Text style={styles.headerSubtitle}>ÖZLÜ NAMAZ TESBİHATI</Text>
                </View>
            </View>

            {/* LOCKED STATE / UNDER CONSTRUCTION */}
            <View style={styles.lockedContainer}>
                <View style={styles.lockedIconContainer}>
                    <Ionicons name="construct" size={64} color={theme.colors.primary} />
                </View>
                <Text style={styles.lockedTitle}>Hazırlanıyor</Text>
                <Text style={styles.lockedText}>
                    Bu bölüm şu anda geliştirme aşamasındadır. En kısa sürede en güzel haliyle hizmetinize sunulacaktır.
                </Text>
                <View style={styles.lockedBadge}>
                    <Ionicons name="time-outline" size={16} color="#FFF" />
                    <Text style={styles.lockedBadgeText}>Çok Yakında</Text>
                </View>
            </View>

            {/* Reading/Counting Modal (Disabled/Hidden) */}
            <ReadingModal
                visible={false}
                section={null}
                onClose={() => { }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    header: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 8
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed'
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
        letterSpacing: 2
    },

    // Card Styles (These are now unused but kept for reference if needed later)
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    cardIndexContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: theme.colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    cardIndex: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary
    },
    cardContentContainer: {
        flex: 1
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 4,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed'
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#94A3B8'
    },
    cardActionContainer: {
        marginLeft: 8
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // Backdrop
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContainer: {
        width: width * 0.9,
        height: height * 0.8,
        backgroundColor: '#FFF',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 16
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        backgroundColor: '#FFF'
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
        flex: 1
    },
    closeButton: {
        padding: 4
    },
    modalContent: {
        padding: 24
    },
    segment: { marginBottom: 16 },
    segmentArabic: { alignItems: 'center', marginBottom: 24 },
    segmentLatin: { marginBottom: 16 },
    textArabic: {
        fontSize: 26,
        fontWeight: '600',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 40
    },
    textLatin: {
        fontSize: 16,
        color: '#475569',
        lineHeight: 26
    },

    // Counter Styles
    counterContainer: {
        alignItems: 'center',
        paddingVertical: 24
    },
    counterButton: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: theme.colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: theme.colors.primary
    },
    counterButtonComplete: {
        backgroundColor: theme.colors.success, // Green
        borderColor: '#FFF'
    },
    counterText: {
        fontSize: 48,
        fontWeight: '900',
        color: theme.colors.primary
    },
    counterTextComplete: {
        color: '#FFF'
    },
    counterLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.tertiary,
        marginTop: -4
    },
    counterLabelComplete: {
        color: 'rgba(255,255,255,0.8)'
    },
    counterRing: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 80,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        margin: 4
    },
    counterHint: {
        marginTop: 16,
        fontSize: 12,
        color: '#94A3B8'
    },
    // LOCKED STATE STYLES
    lockedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: -60 // Center visually accounting for header
    },
    lockedIconContainer: {
        width: 120,
        height: 120,
        backgroundColor: theme.colors.primaryContainer,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(6, 78, 59, 0.1)'
    },
    lockedTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 12,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed'
    },
    lockedText: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32
    },
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary, // Bronze/Copper
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20
    },
    lockedBadgeText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 14
    },
});
