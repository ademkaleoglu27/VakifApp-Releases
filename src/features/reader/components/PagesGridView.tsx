import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { StreamItem } from '@/services/risaleRepo';

interface Props {
    stream: StreamItem[];
    onPagePress: (index: number) => void;
    isVisible: boolean; // optimizations
}

export const PagesGridView = memo(({ stream, onPagePress, isVisible }: Props) => {
    if (!isVisible) return null;

    const data = React.useMemo(() => {
        return stream
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.type === 'page');
    }, [stream]);

    const renderItem = ({ item }: { item: { item: StreamItem, index: number } }) => {
        const streamItem = item.item;

        // Extract preview text (first chunk)
        const previewText = streamItem.chunks?.[0]?.text_tr || '';
        const pageNum = streamItem.globalPageOrdinal || '?';

        return (
            <TouchableOpacity
                style={styles.gridItem}
                onPress={() => onPagePress(item.index)}
                activeOpacity={0.7}
            >
                <View style={styles.card}>
                    <Text style={styles.pageNumber}>{pageNum}</Text>
                    <Text style={styles.previewText} numberOfLines={6}>
                        {previewText.slice(0, 150)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlashList<{ item: StreamItem, index: number }>
                data={data}
                renderItem={renderItem}
                // @ts-ignore
                estimatedItemSize={120}
                numColumns={3}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#e2e8f0', // Darker background for grid
    },
    listContent: {
        padding: 8,
        paddingTop: 60, // Space for header
    },
    gridItem: {
        flex: 1,
        margin: 4,
        height: 140,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    pageNumber: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748b',
        marginBottom: 4,
        textAlign: 'right'
    },
    previewText: {
        fontSize: 6,
        color: '#334155',
        lineHeight: 8,
    }
});
