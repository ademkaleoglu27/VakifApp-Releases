import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getChunksBySection, RisaleChunk } from '../../../services/risaleRepo';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_SIZE_KEY = 'risale_font_size';
const LAST_READ_KEY = 'last_read_risale';

export const RisaleReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { sectionId, sectionTitle, workTitle } = route.params;

    const [fontSize, setFontSize] = useState(18);

    useEffect(() => {
        navigation.setOptions({ title: sectionTitle || workTitle });
    }, [sectionTitle]);

    const { data: chunks, isLoading } = useQuery({
        queryKey: ['risaleChunks', sectionId],
        queryFn: () => getChunksBySection(sectionId),
    });

    useEffect(() => {
        AsyncStorage.getItem(FONT_SIZE_KEY).then(val => {
            if (val) setFontSize(parseInt(val, 10));
        });
    }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const first = viewableItems[0].item as RisaleChunk;
            AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify({
                workTitle,
                sectionId,
                chunkNo: first.chunk_no,
                title: sectionTitle
            }));
        }
    }).current;

    const increaseFont = () => {
        const newSize = Math.min(fontSize + 2, 32);
        setFontSize(newSize);
        AsyncStorage.setItem(FONT_SIZE_KEY, newSize.toString());
    };

    const decreaseFont = () => {
        const newSize = Math.max(fontSize - 2, 14);
        setFontSize(newSize);
        AsyncStorage.setItem(FONT_SIZE_KEY, newSize.toString());
    };

    const renderItem = ({ item }: { item: RisaleChunk }) => (
        <View style={styles.chunkContainer}>
            <Text style={[styles.text, { fontSize, lineHeight: fontSize * 1.6 }]}>
                {item.text_tr}
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
                data={chunks}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fffbeb', // Lighter cream
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    chunkContainer: {
        marginBottom: 16,
    },
    text: {
        color: '#1f2937',
        fontFamily: 'System',
        textAlign: 'justify'
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb'
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
