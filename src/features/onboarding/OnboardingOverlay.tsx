import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Animated, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStorage, ONBOARDING_ENABLED } from './storage';

const { width, height } = Dimensions.get('window');

export const OnboardingOverlay = ({ onComplete }: { onComplete?: () => void }) => {
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(1);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        if (!ONBOARDING_ENABLED) return;
        const completed = await OnboardingStorage.isOnboardingCompleted();
        if (!completed) {
            setVisible(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }
    };

    const handleNext = () => {
        setStep(prev => prev + 1);
    };

    const handleComplete = async () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(async () => {
            setVisible(false);
            await OnboardingStorage.setOnboardingCompleted();
            if (onComplete) onComplete();
        });
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade">
            <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.5)" />
            <View style={styles.overlay}>
                <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>

                    {/* STEP 1: WELCOME */}
                    {step === 1 && (
                        <>
                            <View style={styles.iconContainer}>
                                <Ionicons name="book-outline" size={40} color="#4F46E5" />
                            </View>
                            <Text style={styles.title}>Nur Mektebi'ne Hoş Geldiniz</Text>
                            <Text style={styles.desc}>Sol menüden Kütüphane ve araçlara kolayca ulaşabilirsiniz.</Text>

                            <View style={styles.actions}>
                                <TouchableOpacity onPress={handleComplete} style={styles.skipBtn}>
                                    <Text style={styles.skipText}>Atla</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleNext} style={styles.primaryBtn}>
                                    <Text style={styles.primaryText}>Devam</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* STEP 2: READER HINT */}
                    {step === 2 && (
                        <>
                            <View style={styles.iconContainer}>
                                <Ionicons name="search-outline" size={40} color="#4F46E5" />
                            </View>
                            <Text style={styles.title}>Hızlı Lügat</Text>
                            <Text style={styles.desc}>Okurken bilmediğiniz bir kelimeye dokunarak lügati anında açabilirsiniz.</Text>

                            <View style={styles.actions}>
                                <TouchableOpacity onPress={handleComplete} style={styles.skipBtn}>
                                    <Text style={styles.skipText}>Atla</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleComplete} style={styles.primaryBtn}>
                                    <Text style={styles.primaryText}>Bitti</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* Progress Dots */}
                    <View style={styles.pagination}>
                        <View style={[styles.dot, step === 1 && styles.activeDot]} />
                        <View style={[styles.dot, step === 2 && styles.activeDot]} />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 10,
        textAlign: 'center'
    },
    desc: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    skipBtn: {
        padding: 12,
    },
    skipText: {
        color: '#9CA3AF',
        fontWeight: '600'
    },
    primaryBtn: {
        backgroundColor: '#4F46E5',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 12,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4
    },
    primaryText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    pagination: {
        flexDirection: 'row',
        gap: 8
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB'
    },
    activeDot: {
        backgroundColor: '#4F46E5',
        width: 20
    }
});
