import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSectionsByWork } from '@/services/risaleRepo';
import { RisaleSection } from '@/types/risale';

export const RisaleVirtualPageSectionList = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { workId, workTitle } = route.params;

    const { data: sections, isLoading } = useQuery({
        queryKey: ['sections', workId],
        queryFn: () => getSectionsByWork(workId),
    });

    const renderItem = ({ item }: { item: RisaleSection }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('RisaleVirtualPageReader', {
                bookId: workId,
                sectionId: item.id,
                sectionTitle: item.title,
                workTitle: workTitle,
            })}
        >
            <View style={styles.itemIcon}>
                <Text style={styles.itemIndex}>{item.section_index}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>{workTitle}</Text>
            </View>

            <FlatList
                data={sections}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backBtn: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        flex: 1,
    },
    list: {
        padding: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    itemIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0F9FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemIndex: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0EA5E9',
    },
    itemTitle: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
    },
});
