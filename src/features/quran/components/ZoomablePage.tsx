import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, withSpring, runOnJS, SharedValue, useDerivedValue } from 'react-native-reanimated';
import { calculateClamp } from '../utils/zoomMath';
import { QuranPackService } from '../services/QuranPackService';
import * as FileSystem from 'expo-file-system';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';

interface ZoomablePageProps {
    pageNumber: number;
    width: number;
    height: number;
    scale: SharedValue<number>;
    tx: SharedValue<number>;
    ty: SharedValue<number>;
    onZoomPageChange: (direction: 'next' | 'prev') => void;
}

export const ZoomablePage = React.memo(({ pageNumber, width, height, scale, tx, ty, onZoomPageChange }: ZoomablePageProps) => {
    const [source, setSource] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            const uri = QuranPackService.getPageUri(pageNumber);
            if (!uri) {
                if (isMounted) setStatus('error');
                return;
            }
            const info = await FileSystem.getInfoAsync(uri);
            if (info.exists && isMounted) {
                setSource(uri);
                setStatus('ready');
            } else if (isMounted) {
                setStatus('error');
            }
        };
        load();
        return () => { isMounted = false; };
    }, [pageNumber]);

    const gestures = React.useMemo(() => Gesture.Simultaneous(
        Gesture.Pinch()
            .onStart((_e, ctx: any) => {
                ctx.startScale = scale.value;
            })
            .onUpdate((e, ctx: any) => {
                scale.value = Math.max(1, Math.min(ctx.startScale * e.scale, 3));
            })
            .onEnd(() => {
                if (scale.value < 1.05) {
                    scale.value = withSpring(1);
                    tx.value = withSpring(0);
                    ty.value = withSpring(0);
                }
            }),
        Gesture.Pan()
            .minPointers(1)
            .averageTouches(true)
            .onStart((_e, ctx: any) => {
                ctx.startTx = tx.value;
                ctx.startTy = ty.value;
            })
            .onUpdate((e, ctx: any) => {
                if (scale.value > 1.01) {
                    tx.value = ctx.startTx + e.translationX;
                    ty.value = ctx.startTy + e.translationY;
                }
            })
            .onEnd((e) => {
                if (scale.value > 1.01) {
                    // Check Zoomed Page Switch
                    const threshold = width * 0.33;

                    if (tx.value > threshold && e.velocityX > 200) {
                        runOnJS(onZoomPageChange)('prev');
                    } else if (tx.value < -threshold && e.velocityX < -200) {
                        runOnJS(onZoomPageChange)('next');
                    } else {
                        // Clamp
                        const clamped = calculateClamp(scale.value, tx.value, ty.value, width, height);
                        tx.value = withSpring(clamped.x);
                        ty.value = withSpring(clamped.y);
                    }
                }
            })
    ), [scale, tx, ty, width, height, onZoomPageChange]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: tx.value },
            { translateY: ty.value },
            { scale: scale.value }
        ]
    }));

    if (status === 'error') {
        return (
            <View style={[styles.container, { width, height, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontWeight: 'bold', marginTop: 8 }}>Sayfa {pageNumber} Yok</Text>
            </View>
        );
    }

    if (status === 'loading') {
        return (
            <View style={[styles.container, { width, height, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <GestureDetector gesture={gestures}>
            <Animated.View style={[{ width, height, overflow: 'hidden' }, animatedStyle]}>
                <Image
                    source={{ uri: source! }}
                    style={{ flex: 1, width: '100%', height: '100%' }}
                    contentFit="contain"
                    transition={200}
                />
            </Animated.View>
        </GestureDetector>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    }
});
