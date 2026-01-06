import React, { memo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { ReaderTheme } from '../../constants/theme';

interface ReaderHeaderProps {
    title: string;
    sectionTitle?: string;
    currentPage: number;
    totalPage?: number;
}

export const ReaderHeader: React.FC<ReaderHeaderProps> = memo(({ title, sectionTitle, currentPage, totalPage }) => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.titleContainer}>
                    <Text numberOfLines={1} ellipsizeMode="tail">
                        <Text style={styles.bookTitle}>{title}</Text>
                        {sectionTitle && (
                            <Text style={styles.sectionTitle}>
                                <Text style={styles.separator}> - </Text>
                                {sectionTitle}
                            </Text>
                        )}
                    </Text>
                </View>
                <Text style={styles.pageInfo}>
                    {currentPage}{totalPage ? ` / ${totalPage}` : ''}
                </Text>
            </View>
            <View style={styles.doubleBorderHelper} />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: ReaderTheme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        zIndex: 10,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        elevation: 0,
    },
    doubleBorderHelper: {
        height: 2, // Very tight double line
        borderTopWidth: 1,
        borderTopColor: '#000',
        marginTop: 1,
    },
    content: {
        height: 24, // Increased from 15 to 24 to fit text
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: ReaderTheme.spacing.pagePadding,
        paddingBottom: 2, // Slight breathing room
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 10,
    },
    bookTitle: {
        fontSize: 14, // Increased from 11
        fontWeight: 'normal',
        fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif' }),
        color: '#000',
    },
    separator: {
        fontSize: 14,
        color: '#000',
        fontWeight: 'normal',
        fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif' }),
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'normal',
        fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif' }),
        color: '#000',
    },
    pageInfo: {
        fontSize: 12, // Increased from 10
        color: '#000',
        fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif' }),
        fontVariant: ['tabular-nums'],
    }
});
