
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { CEVSEN_CHAPTERS } from '../data/CevsenMeta';

export const CevsenMenuScreen = () => {
    const navigation = useNavigation<any>();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredChapters = CEVSEN_CHAPTERS.filter(c =>
        c.title.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
        c.id.toString().includes(searchQuery)
    );

    const navigateToPage = (page: number) => {
        // Navigate back to reader with params
        // Note: The reader needs to listen to route params update or we reset the stack
        // Ideally we navigate to 'CevsenReaderScreen' which pushes a new screen or updates existing if single top?
        // Default stack behavior pushes new. 
        // Better: navigation.navigate('CevsenReaderScreen', { initialPage: page, title: 'Büyük Cevşen' });
        navigation.navigate('CevsenReaderScreen', { initialPage: page, title: 'Büyük Cevşen' });
    };

    const renderItem = ({ item }: { item: typeof CEVSEN_CHAPTERS[0] }) => (
        <TouchableOpacity style={styles.item} onPress={() => navigateToPage(item.page)}>
            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                {/* Dotted spacer could go here if needed, but flex row justify-between is cleaner for mobile */}
            </View>
            <View style={styles.pageContainer}>
                <Text style={styles.pageText}>{item.displayPage}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#334155" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>İçindekiler</Text>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Bölüm ara..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>

            {/* List */}
            <FlatList
                data={filteredChapters}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },

    // List Styles
    listContent: { padding: 20 },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16
    },
    content: { flex: 1, paddingRight: 16 },
    title: { fontSize: 16, fontWeight: '500', color: '#334155' },

    pageContainer: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        minWidth: 40,
        alignItems: 'center'
    },
    pageText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary },

    separator: { height: 1, backgroundColor: '#F1F5F9' },

    // Unused but kept if needed later or remove if strict
    searchContainer: { display: 'none' }, // Hiding search for now as it's a short static list
    searchIcon: {},
    searchInput: {},
    empty: {},
    emptyText: {}
});
