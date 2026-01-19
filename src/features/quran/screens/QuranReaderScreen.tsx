import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, ActivityIndicator, Image, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { QuranService } from '../services/QuranService';
import { QuranMeta } from '../services/QuranMeta';

const { width, height } = Dimensions.get('window');

const PageItem = React.memo(({ pageNumber }: { pageNumber: number }) => {
    const [source, setSource] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            const src = await QuranService.getPageSource(pageNumber);
            if (mounted) {
                setSource(src);
                setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [pageNumber]);

    if (loading) {
        return (
            <View style={styles.pageContainer}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <View style={styles.pageContainer}>
            {source && (
                <Image
                    source={{ uri: source }}
                    style={styles.pageImage}
                    resizeMode="contain"
                />
            )}
            <View style={styles.pageFooter}>
                <Text style={styles.pageNumberText}>{pageNumber}</Text>
            </View>
        </View>
    );
});

export const QuranReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { initialPage, juzNumber } = route.params;

    // Create an array of 604 pages
    const data = Array.from({ length: 604 }, (_, i) => i + 1);

    // State to track current visible page/surah
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [headerTitle, setHeaderTitle] = useState('');

    const flatListRef = useRef<FlatList>(null);

    // Update header whenever page changes
    useEffect(() => {
        const surah = QuranMeta.getSurahNameByPage(currentPage);
        setHeaderTitle(`${surah} - Sayfa ${currentPage}`);
    }, [currentPage]);

    // Track visible items to update current page
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const page = viewableItems[0].item;
            setCurrentPage(page);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    const getItemLayout = (data: any, index: number) => ({
        length: width,
        offset: width * index,
        index,
    });

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Overlay Header */}
            {/* Top increased to 80 to ensure it clears page headers */}
            <View style={styles.overlayHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={24} color="#334155" />
                </TouchableOpacity>

                {/* Dynamic Title Pillar */}
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitleText}>{headerTitle}</Text>
                </View>

                {/* Empty View for balance */}
                <View style={[styles.iconButton, { opacity: 0 }]} />
            </View>

            <FlatList
                ref={flatListRef}
                data={data}
                renderItem={({ item }) => <PageItem pageNumber={item} />}
                keyExtractor={item => item.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialPage - 1} // 0-based index
                getItemLayout={getItemLayout}
                windowSize={3} // Optimize memory
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8F0',
    },
    overlayHeader: {
        position: 'absolute',
        top: 40, // Moved up as requested
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16
    },
    iconButton: {
        width: 36,
        height: 36,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    headerTitleContainer: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        alignItems: 'center'
    },
    headerTitleText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155'
    },
    pageContainer: {
        width: width,
        height: height,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF8F0'
    },
    pageImage: {
        width: width,
        height: height,
    },
    pageFooter: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
    },
    pageNumberText: {
        fontSize: 12,
        color: '#666',
        backgroundColor: 'rgba(255,255,255,0.5)',
        padding: 4
    }
});
