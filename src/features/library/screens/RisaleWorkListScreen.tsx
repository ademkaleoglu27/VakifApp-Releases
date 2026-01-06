import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getRisaleWorks, RisaleWork } from '../../../services/risaleRepo';
import { useNavigation } from '@react-navigation/native';

export const RisaleWorkListScreen = () => {
    const navigation = useNavigation<any>();

    const { data: works, isLoading, error } = useQuery({
        queryKey: ['risaleWorks'],
        queryFn: getRisaleWorks,
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
                <Text style={styles.error}>Hata: {(error as Error).message}</Text>
            </View>
        );
    }

    const renderItem = ({ item }: { item: RisaleWork }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('RisaleSectionList', { workId: item.id, workTitle: item.title })}
        >
            <View style={styles.iconPlaceholder} />
            <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.category}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={works}
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    iconPlaceholder: {
        width: 48,
        height: 64, // Book ratio
        backgroundColor: '#94a3b8',
        borderRadius: 4,
        marginRight: 16,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
    },
    error: {
        color: '#ef4444',
        fontSize: 16,
    },
});
