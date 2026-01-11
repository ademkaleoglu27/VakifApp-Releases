import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StatusBar, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type ReaderHeaderProps = {
    workTitle: string;
    subTitle: string;
    sectionTitle: string;
    pageNumber: number;
    onResetZoom: () => void;
};

export const ReaderHeader = memo(({ workTitle, subTitle, sectionTitle, pageNumber, onResetZoom }: ReaderHeaderProps) => {
    const navigation = useNavigation();

    return (
        <>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.headerBreadcrumb} numberOfLines={1}>
                        {workTitle} - <Text style={{ fontWeight: '700' }}>{subTitle || sectionTitle}</Text>
                    </Text>
                </View>

                {/* Page Counter - HIDDEN IN ZEN MODE IF 0 */}
                {pageNumber > 0 && (
                    <View style={styles.pageBadge}>
                        <Text style={styles.pageText}>
                            Sayfa {pageNumber}
                        </Text>
                    </View>
                )}

                {/* Reset Zoom */}
                <TouchableOpacity onPress={onResetZoom} style={[styles.headerBtn, { marginLeft: 5 }]}>
                    <Ionicons name="text-outline" size={20} color="#5D4037" />
                </TouchableOpacity>
            </View>
            <View style={styles.headerSeparator} />
        </>
    );
});

const styles = StyleSheet.create({
    header: {
        height: Platform.OS === 'android' ? 56 + (StatusBar.currentHeight || 24) : 56,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        backgroundColor: '#FDF6E3',
        elevation: 2,
    },
    headerBtn: {
        padding: 8,
    },
    headerBreadcrumb: {
        fontSize: 14,
        color: '#3E2723',
        fontFamily: 'serif',
    },
    pageBadge: {
        paddingHorizontal: 0,
        paddingVertical: 0,
        marginHorizontal: 8,
    },
    pageText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#3E2723',
        fontFamily: 'serif',
    },
    headerSeparator: {
        height: 1,
        width: '100%',
        backgroundColor: '#A1887F',
        marginBottom: 0,
        elevation: 2,
    },
});
