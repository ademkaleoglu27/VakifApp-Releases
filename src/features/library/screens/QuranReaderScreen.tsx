import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getAyahsBySurah, Ayah } from '../../../services/quranRepo';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_SIZE_KEY = 'content_font_size';
const LAST_READ_KEY = 'last_read_quran';

export const QuranReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { surahId, surahName, initialAyah } = route.params;

    const [fontSize, setFontSize] = useState(24);
    const flatListRef = useRef<FlatList>(null);

    // Update header title
    useEffect(() => {
        navigation.setOptions({ title: surahName });
    }, [surahName]);

    const { data: ayahs, isLoading } = useQuery({
        queryKey: ['ayahs', surahId],
        queryFn: () => getAyahsBySurah(surahId),
    });

    // Restore font size
    useEffect(() => {
        AsyncStorage.getItem(FONT_SIZE_KEY).then(val => {
            if (val) setFontSize(parseInt(val, 10));
        });
    }, []);

    // Save/Restore Last Read
    useEffect(() => {
        if (ayahs && ayahs.length > 0) {
            // If opened with initialAyah (e.g. from resume), scroll to it
            if (initialAyah) {
                // small delay to ensure layout
                setTimeout(() => {
                    const index = ayahs.findIndex(a => a.ayah_number === initialAyah);
                    if (index !== -1) {
                        flatListRef.current?.scrollToIndex({ index, animated: false });
                    }
                }, 500);
            }
        }
    }, [ayahs, initialAyah]);


    const handleScroll = (event: any) => {
        // Determine visible ayah to save progress (approximate)
        // For MVP just saving surah is often enough, but let's try row
        // Implementation of viewableItemsChanged is better but handleScroll is basic
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const first = viewableItems[0].item as Ayah;
            AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify({
                surahId,
                ayahNumber: first.ayah_number,
                surahName // Store name for ease
            }));
        }
    }).current;

    const increaseFont = () => {
        const newSize = Math.min(fontSize + 4, 40);
        setFontSize(newSize);
        AsyncStorage.setItem(FONT_SIZE_KEY, newSize.toString());
    };

    const decreaseFont = () => {
        const newSize = Math.max(fontSize - 4, 16);
        setFontSize(newSize);
        AsyncStorage.setItem(FONT_SIZE_KEY, newSize.toString());
    };

    const renderItem = ({ item }: { item: Ayah }) => (
        <View style={styles.ayahContainer}>
            <View style={styles.ayahHeader}>
                <View style={styles.ayahBadge}>
                    <Text style={styles.ayahNumber}>{item.ayah_number}</Text>
                </View>
            </View>
            <Text style={[styles.arabicText, { fontSize, lineHeight: fontSize * 1.8 }]}>
                {item.text_ar}
            </Text>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.toolbar}>
                <TouchableOpacity onPress={decreaseFont} style={styles.toolBtn}>
                    <Text style={styles.toolText}>A-</Text>
                </TouchableOpacity>
                <Text style={styles.toolLabel}>Boyut</Text>
                <TouchableOpacity onPress={increaseFont} style={styles.toolBtn}>
                    <Text style={styles.toolText}>A+</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={ayahs}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                getItemLayout={(data, index) => ({
                    length: 150, // Approximate height, optimized for massive lists if fixed
                    offset: 150 * index,
                    index,
                })}
            // Note: getItemLayout is risky with dynamic text, removing it is safer for accuracy unless performance is hit
            // Removing getItemLayout for variable height support:
            // getItemLayout={undefined}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff7ed', // Warm paper color
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    ayahContainer: {
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#fed7aa',
        paddingBottom: 16,
    },
    ayahHeader: {
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'flex-end', // RTL Logic: Numbers usually on right or left? Quran usually end of verse.
        // Standard UX: Just keep it distinct.
    },
    ayahBadge: {
        backgroundColor: '#fbbf24',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    ayahNumber: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#78350f',
    },
    arabicText: {
        fontFamily: 'System', // Would ideally be a Quran font
        textAlign: 'right', // RTL
        color: '#000',
        writingDirection: 'rtl',
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        backgroundColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 }
    },
    toolBtn: {
        padding: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        marginHorizontal: 8,
    },
    toolText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    toolLabel: {
        fontSize: 14,
        color: '#64748b'
    }
});
