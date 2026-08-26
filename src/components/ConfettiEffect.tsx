import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
    '#10B981', // Emerald Green
    '#F59E0B', // Gold / Amber
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#FBBF24', // Bright Gold
];

const NUM_CONFETTI = 50;

interface ConfettiPieceProps {
    index: number;
    active: boolean;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ index, active }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    // Random configs per particle
    const startX = useRef(Math.random() * SCREEN_WIDTH).current;
    const endX = useRef(startX + (Math.random() * 120 - 60)).current;
    const size = useRef(Math.random() * 8 + 6).current;
    const isCircle = useRef(Math.random() > 0.5).current;
    const color = useRef(CONFETTI_COLORS[index % CONFETTI_COLORS.length]).current;
    const duration = useRef(Math.random() * 1500 + 2500).current;
    const delay = useRef(Math.random() * 800).current;
    const rotationCount = useRef(Math.random() * 4 + 2).current;

    useEffect(() => {
        if (active) {
            animatedValue.setValue(0);
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: duration,
                delay: delay,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start();
        }
    }, [active]);

    const translateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-30, SCREEN_HEIGHT + 30],
    });

    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [startX, endX],
    });

    const rotate = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${rotationCount * 360}deg`],
    });

    const opacity = animatedValue.interpolate({
        inputRange: [0, 0.1, 0.8, 1],
        outputRange: [0, 1, 1, 0],
    });

    if (!active) return null;

    return (
        <Animated.View
            style={[
                styles.confetti,
                {
                    width: size,
                    height: isCircle ? size : size * 1.6,
                    borderRadius: isCircle ? size / 2 : 2,
                    backgroundColor: color,
                    transform: [{ translateX }, { translateY }, { rotate }],
                    opacity,
                },
            ]}
        />
    );
};

interface ConfettiEffectProps {
    active: boolean;
    onComplete?: () => void;
}

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ active, onComplete }) => {
    useEffect(() => {
        if (active && onComplete) {
            const timer = setTimeout(() => {
                onComplete();
            }, 4500);
            return () => clearTimeout(timer);
        }
    }, [active]);

    if (!active) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {Array.from({ length: NUM_CONFETTI }).map((_, i) => (
                <ConfettiPiece key={i} index={i} active={active} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    confetti: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
});
