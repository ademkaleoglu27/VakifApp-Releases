import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator, Text, Platform } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { FlatList } from 'react-native-gesture-handler';
import * as FileSystem from 'expo-file-system';

import { ReaderTheme, FontFamily, cleanTitle } from '@/config/fonts';
import { RisaleAssets } from '@/services/risaleAssets';
import { ReaderBlockRenderer, Block, RenderPresets } from '../components/ReaderBlockRenderer';

// Types
type RouteParams = {
    RisaleReader: {
        bookId?: string;
        title: string;
        initialBlockIndex?: number;
    };
};

const HEADER_HEIGHT = 48;
const MIN_SCALE = 0.8;
const MAX_SCALE = 2.5;
const DEFAULT_SCALE = 1;

export const ReaderScreen = () => {
    const route = useRoute<RouteProp<RouteParams, 'RisaleReader'>>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { bookId, title } = route.params;

    // Data State
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [presets, setPresets] = useState<RenderPresets | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Debug Meta State
    const [metaInfo, setMetaInfo] = useState<{ version?: string, updatedAt?: string, source?: string } | null>(null);

    // UI State
    const [controlsVisible, setControlsVisible] = useState(true);
    const [baseFontSize, setBaseFontSize] = useState(22); // Default 22 for better readability

    // Gestures
    const scale = useSharedValue(DEFAULT_SCALE);
    const savedScale = useSharedValue(DEFAULT_SCALE);
    const flatListRef = useRef<FlatList>(null);

    // --- Loading Logic ---
    useEffect(() => {
        const loadContent = async () => {
            try {
                if (!bookId) {
                    throw new Error('Book ID missing');
                }

                const path = RisaleAssets.getJsonPath(`${bookId}.json`);
                // Determine source for debug
                const isDocDir = path.includes(FileSystem.documentDirectory || 'weird-path');
                const source = isDocDir ? 'documentDirectory' : 'bundle';

                const info = await FileSystem.getInfoAsync(path);
                if (!info.exists) {
                    throw new Error(`Dosya bulunamadı: ${bookId}.json`);
                }

                const contentStr = await FileSystem.readAsStringAsync(path);
                const json = JSON.parse(contentStr);

                if (json.cleaned_blocks) setBlocks(json.cleaned_blocks);
                else if (json.blocks) setBlocks(json.blocks);

                if (json.render_presets) setPresets(json.render_presets);
                else if (json.presets) setPresets(json.presets);

                // Get Meta for Footer
                const meta = await RisaleAssets.getMeta();
                setMetaInfo({
                    version: meta?.version,
                    updatedAt: meta?.updatedAt,
                    source: source
                });

            } catch (e) {
                console.error(e);
                setError((e as Error).message);
            } finally {
                setLoading(false);
            }
        };

        loadContent();
    }, [bookId]);

    // --- Gestures ---
    const toggleControls = useCallback(() => {
        setControlsVisible(v => !v);
    }, []);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale));
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    const tapGesture = Gesture.Tap().onEnd(() => {
        runOnJS(toggleControls)();
    });

    const composedGesture = Gesture.Simultaneous(pinchGesture, tapGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const resetZoom = useCallback(() => {
        scale.value = withSpring(DEFAULT_SCALE);
        savedScale.value = DEFAULT_SCALE;
    }, []);

    // --- Rendering ---
    const renderItem = useCallback(({ item }: { item: Block }) => {
        if (!presets) return null;

        // Directly use ReaderBlockRenderer with NO extra wrappers/styles
        return (
            <ReaderBlockRenderer
                block={item}
                presets={presets}
                baseFontSize={baseFontSize}
            />
        );
    }, [presets, baseFontSize]);

    // Error State
    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (loading || !presets) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={ReaderTheme.titleText} />
                <Text>Yükleniyor...</Text>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar barStyle="dark-content" hidden={!controlsVisible} translucent backgroundColor="transparent" />

            {/* Header */}
            {controlsVisible && (
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <Ionicons name="arrow-back" size={24} color={ReaderTheme.titleText} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{cleanTitle(title)}</Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={resetZoom} style={styles.iconBtn}>
                            <Ionicons name="scan-outline" size={24} color={ReaderTheme.titleText} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* List */}
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.contentWrapper, animatedStyle]}>
                    <FlatList
                        ref={flatListRef}
                        data={blocks}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => `${item.type}-${index}`}
                        contentContainerStyle={[
                            styles.listContent,
                            {
                                paddingTop: controlsVisible ? HEADER_HEIGHT + insets.top + 20 : 20,
                                paddingBottom: controlsVisible ? 80 + insets.bottom : 40,
                            }
                        ]}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={Platform.OS === 'android'}
                        showsVerticalScrollIndicator={false}
                    />
                </Animated.View>
            </GestureDetector>

            {/* Footer */}
            {controlsVisible && (
                <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
                    <TouchableOpacity style={styles.fontBtn} onPress={() => setBaseFontSize(s => Math.max(14, s - 2))}>
                        <Text style={styles.fontBtnText}>A-</Text>
                    </TouchableOpacity>
                    <Text style={styles.fontLabel}>{baseFontSize}</Text>
                    <TouchableOpacity style={styles.fontBtn} onPress={() => setBaseFontSize(s => Math.min(36, s + 2))}>
                        <Text style={styles.fontBtnText}>A+</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Debug Info Footer (DEV Only) */}
            {__DEV__ && controlsVisible && metaInfo && (
                <View style={[styles.debugFooter, { paddingBottom: insets.bottom }]}>
                    <Text style={styles.debugText}>
                        v{metaInfo.version} ({metaInfo.updatedAt}) | {bookId} | {metaInfo.source}
                    </Text>
                </View>
            )}
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ReaderTheme.background,
    },
    centerContainer: {
        flex: 1,
        backgroundColor: ReaderTheme.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        marginBottom: 16
    },
    backBtn: {
        padding: 12,
        backgroundColor: '#eee',
        borderRadius: 8
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_HEIGHT + 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: ReaderTheme.overlay,
        zIndex: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: ReaderTheme.border,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: ReaderTheme.titleText,
        flex: 1,
        textAlign: 'center',
        fontFamily: FontFamily.Body,
    },
    headerRight: {
        flexDirection: 'row'
    },
    iconBtn: {
        padding: 8,
    },
    contentWrapper: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        backgroundColor: ReaderTheme.overlay,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: ReaderTheme.border,
    },
    fontBtn: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    fontBtnText: {
        fontSize: 18,
        fontWeight: '600',
        color: ReaderTheme.text,
        fontFamily: FontFamily.Body,
    },
    fontLabel: {
        fontSize: 18,
        color: ReaderTheme.text,
        fontFamily: FontFamily.Body,
        minWidth: 34,
        textAlign: 'center',
    },
    debugFooter: {
        position: 'absolute',
        bottom: 70, // above footer
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 4,
    },
    debugText: {
        color: 'white',
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    }
});
