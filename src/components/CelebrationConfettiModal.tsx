import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Animated, Dimensions, Easing, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#FFD700'
];

const NUM_CONFETTI = 40;

interface ConfettiPieceProps {
    index: number;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ index }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const randomColor = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
    const randomLeft = (index * (SCREEN_WIDTH / NUM_CONFETTI)) + (Math.random() * 10 - 5);
    const randomSize = Math.floor(Math.random() * 8) + 6;
    const isCircle = index % 3 === 0;
    const randomRotation = Math.random() * 360;

    useEffect(() => {
        const delay = (index % 10) * 120 + Math.random() * 200;
        const duration = 2400 + Math.random() * 1200;

        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: duration,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const translateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-30, SCREEN_HEIGHT + 30],
    });

    const rotate = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [`${randomRotation}deg`, `${randomRotation + 360}deg`],
    });

    const opacity = animatedValue.interpolate({
        inputRange: [0, 0.1, 0.85, 1],
        outputRange: [0, 1, 0.9, 0],
    });

    return (
        <Animated.View
            style={[
                styles.confetti,
                {
                    left: randomLeft,
                    width: randomSize,
                    height: isCircle ? randomSize : randomSize * 1.6,
                    borderRadius: isCircle ? randomSize / 2 : 2,
                    backgroundColor: randomColor,
                    transform: [{ translateY }, { rotate }],
                    opacity,
                },
            ]}
        />
    );
};

export interface CelebrationModalProps {
    visible: boolean;
    title?: string;
    subtitle?: string;
    quote?: string;
    quoteSource?: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
    onClose: () => void;
}

export const CelebrationConfettiModal: React.FC<CelebrationModalProps> = ({
    visible,
    title = 'Tebrikler! 🎉',
    subtitle = 'Manevi bir basamağı daha muvaffakiyetle tamamladınız.',
    quote = 'Kur’an okuyunuz! Çünkü o, kıyamet gününde okuyanlarına şefaatçi olarak gelecektir.',
    quoteSource = 'Hadis-i Şerif (Müslim)',
    primaryButtonText = 'Elhamdülillah',
    onPrimaryPress,
    secondaryButtonText,
    onSecondaryPress,
    onClose,
}) => {
    const scaleAnim = useRef(new Animated.Value(0.7)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.7);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Background Confetti Rain */}
                <View style={styles.confettiContainer} pointerEvents="none">
                    {Array.from({ length: NUM_CONFETTI }).map((_, i) => (
                        <ConfettiPiece key={i} index={i} />
                    ))}
                </View>

                {/* Animated Dialog Card */}
                <Animated.View
                    style={[
                        styles.dialogContainer,
                        {
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                        },
                    ]}
                >
                    <LinearGradient
                        colors={['#FFFDF7', '#FFF8E7']}
                        style={styles.dialogCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {/* Top Badge Icon */}
                        <View style={styles.iconCircle}>
                            <Ionicons name="sparkles" size={32} color="#D97706" />
                        </View>

                        <Text style={styles.titleText}>{title}</Text>
                        <Text style={styles.subtitleText}>{subtitle}</Text>

                        {/* Motivational Quote Box */}
                        {!!quote && (
                            <View style={styles.quoteBox}>
                                <Ionicons name="bookmark-outline" size={16} color="#B45309" style={{ marginBottom: 4 }} />
                                <Text style={styles.quoteText}>"{quote}"</Text>
                                {!!quoteSource && (
                                    <Text style={styles.quoteSourceText}>— {quoteSource}</Text>
                                )}
                            </View>
                        )}

                        {/* Buttons */}
                        <View style={styles.buttonRow}>
                            {!!secondaryButtonText && (
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={onSecondaryPress || onClose}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={onPrimaryPress || onClose}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#047857', '#064E3B']}
                                    style={styles.primaryGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
                                    <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    confettiContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    confetti: {
        position: 'absolute',
        top: 0,
    },
    dialogContainer: {
        width: '100%',
        maxWidth: 360,
        zIndex: 10,
    },
    dialogCard: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        borderWidth: 2,
        borderColor: '#F59E0B',
    },
    titleText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#78350F',
        textAlign: 'center',
        marginBottom: 6,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    subtitleText: {
        fontSize: 13,
        color: '#8B7355',
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 16,
    },
    quoteBox: {
        width: '100%',
        backgroundColor: '#FEF9C3',
        borderRadius: 14,
        padding: 14,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
        alignItems: 'center',
    },
    quoteText: {
        fontSize: 13,
        fontStyle: 'italic',
        color: '#713F12',
        textAlign: 'center',
        lineHeight: 20,
    },
    quoteSourceText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#B45309',
        marginTop: 6,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
        marginTop: 4,
    },
    secondaryButton: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    primaryButton: {
        flex: 1.5,
        borderRadius: 14,
        overflow: 'hidden',
    },
    primaryGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 6,
    },
    primaryButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
});
