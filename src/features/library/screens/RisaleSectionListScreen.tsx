import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getSectionsByWork, RisaleSection } from '../../../services/risaleRepo';
import { useRoute, useNavigation } from '@react-navigation/native';

export const RisaleSectionListScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { workId, workTitle } = route.params;

    useEffect(() => {
        navigation.setOptions({ title: workTitle });
    }, [workTitle]);

    const { data: sections, isLoading, error } = useQuery({
        queryKey: ['risaleSections', workId],
        queryFn: () => getSectionsByWork(workId),
    });

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={{ color: 'red', fontWeight: 'bold' }}>Hata: {(error as Error).message}</Text>
            </View>
        );
    }

    const renderItem = ({ item }: { item: RisaleSection }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('RisaleReader', {
                mode: 'section',
                bookId: workId,
                sectionId: item.id,
                sectionTitle: item.title,
                workTitle
            })}
        >
            <Text style={styles.title}>{item.title}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={sections}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    item: {
        backgroundColor: '#ffffff',
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#0ea5e9',
        elevation: 1,
    },
    title: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
    },
});
