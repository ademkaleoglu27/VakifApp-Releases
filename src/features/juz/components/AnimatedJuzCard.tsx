import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';

export interface HatimPartItem {
    id: string;
    hatim_id: string;
    juz_number: number;
    status: 'AVAILABLE' | 'TAKEN' | 'COMPLETED';
    assigned_to_name?: string | null;
    assigned_to_id?: string | null;
}

interface AnimatedJuzCardProps {
    part: HatimPartItem;
    onPress: (part: HatimPartItem) => void;
    currentUserId?: string;
}

export const AnimatedJuzCard: React.FC<AnimatedJuzCardProps> = ({
    part,
    onPress,
    currentUserId
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const prevStatusRef = useRef<string>(part.status);

    useEffect(() => {
        // Trigger pulse animation when status changes via Realtime WebSocket
        if (prevStatusRef.current !== part.status) {
            prevStatusRef.current = part.status;
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.15,
                    duration: 180,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 4,
                    tension: 50,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [part.status]);

    const isAvailable = part.status === 'AVAILABLE';
    const isTaken = part.status === 'TAKEN';
    const isCompleted = part.status === 'COMPLETED';
    const isMyJuz = !!part.assigned_to_id && part.assigned_to_id === currentUserId;

    // Theme Styles
    let cardBg = '#F8FAFC';
    let borderColor = '#E2E8F0';
    let textColor = '#64748B';
    let badgeBg = '#F1F5F9';
    let badgeText = '#64748B';

    if (isTaken) {
        cardBg = isMyJuz ? '#FFFBEB' : '#FFF7ED';
        borderColor = isMyJuz ? '#F59E0B' : '#FDBA74';
        textColor = isMyJuz ? '#B45309' : '#C2410C';
        badgeBg = '#FFEDD5';
        badgeText = '#C2410C';
    } else if (isCompleted) {
        cardBg = '#F0FDF4';
        borderColor = '#86EFAC';
        textColor = '#15803D';
        badgeBg = '#DCFCE7';
        badgeText = '#15803D';
    }

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                style={[
                    styles.card,
                    {
                        backgroundColor: cardBg,
                        borderColor,
                        borderWidth: isMyJuz || isCompleted ? 1.5 : 1,
                    },
                ]}
                onPress={() => onPress(part)}
                activeOpacity={0.7}
            >
                {/* Top Row: Number & Status Badge */}
                <View style={styles.topRow}>
                    <View style={styles.numberBadge}>
                        <Text
                            style={[
                                styles.juzNumberText,
                                { color: isAvailable ? '#94A3B8' : textColor },
                            ]}
                        >
                            {part.juz_number}
                        </Text>
                    </View>

                    {isCompleted && (
                        <View style={styles.statusIconBox}>
                            <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                        </View>
                    )}

                    {isTaken && isMyJuz && (
                        <View style={[styles.statusIconBox, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="person" size={12} color="#B45309" />
                        </View>
                    )}
                </View>

                {/* Content Area */}
                <View style={styles.contentArea}>
                    {isAvailable ? (
                        <View style={styles.availableBox}>
                            <Ionicons name="add" size={20} color="#94A3B8" />
                            <Text style={styles.availableLabel}>Al</Text>
                        </View>
                    ) : (
                        <View style={styles.assignedBox}>
                            <Text
                                style={[
                                    styles.assigneeName,
                                    { color: textColor, fontWeight: isMyJuz ? 'bold' : '600' },
                                ]}
                                numberOfLines={2}
                            >
                                {isMyJuz ? 'Ben' : part.assigned_to_name || 'Alındı'}
                            </Text>
                            <View style={[styles.miniStatusBadge, { backgroundColor: badgeBg }]}>
                                <Text style={[styles.miniStatusText, { color: badgeText }]}>
                                    {isCompleted ? 'Okundu' : 'Okuyor'}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '23%',
        marginHorizontal: '1%',
        marginBottom: 10,
    },
    card: {
        borderRadius: 16,
        padding: 8,
        minHeight: 92,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 2,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    numberBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    juzNumberText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    statusIconBox: {
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 4,
    },
    availableBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    availableLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: -2,
    },
    assignedBox: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    assigneeName: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 14,
    },
    miniStatusBadge: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
    },
    miniStatusText: {
        fontSize: 9,
        fontWeight: '700',
    },
});
