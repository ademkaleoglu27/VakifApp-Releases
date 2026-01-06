import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RisaleUserDb, Assignment } from '@/services/risaleUserDb';

export const AssignmentListScreen = () => {
    const navigation = useNavigation();
    const [assignments, setAssignments] = useState<Assignment[]>([]);

    useFocusEffect(
        useCallback(() => {
            loadAssignments();
        }, [])
    );

    const loadAssignments = async () => {
        const data = await RisaleUserDb.getAssignments();
        setAssignments(data);
    };

    const handleToggle = async (id: string) => {
        await RisaleUserDb.toggleAssignmentComplete(id);
        loadAssignments();
    };

    const renderItem = ({ item }: { item: Assignment }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleToggle(item.id)}
            activeOpacity={0.8}
        >
            <View style={[styles.statusIndicator, { backgroundColor: item.is_completed ? theme.colors.success : theme.colors.warning }]} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.title, !!item.is_completed && styles.completedText]}>{item.title}</Text>
                    {!!item.is_completed && <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />}
                </View>
                <Text style={styles.person}>
                    <Ionicons name="person-outline" size={14} color={theme.colors.primary} />
                    {' '}{item.assignee_name} {item.assignee_surname}
                </Text>
                {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[theme.colors.primary, '#1e3a8a']}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Görevlendirmeler</Text>
                <View style={{ width: 40 }} />
            </LinearGradient>

            <FlatList
                data={assignments}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="checkbox-outline" size={64} color={theme.colors.outline} />
                        <Text style={styles.emptyText}>Henüz görevlendirme yapılmamış.</Text>
                        <Text style={styles.subText}>Heyet ekranından kişilere görev atayabilirsiniz.</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    list: {
        padding: 16,
    },
    card: {
        borderRadius: 12,
        backgroundColor: 'white',
        flexDirection: 'row',
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statusIndicator: {
        width: 6,
    },
    cardContent: {
        flex: 1,
        padding: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.onSurface,
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: theme.colors.onSurfaceVariant,
    },
    person: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '500',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: theme.colors.onSurfaceVariant,
        marginBottom: 8,
    },
    date: {
        fontSize: 12,
        color: theme.colors.outline,
        textAlign: 'right',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        color: theme.colors.onSurfaceVariant,
        fontSize: 16,
        fontWeight: 'bold',
    },
    subText: {
        marginTop: 8,
        color: theme.colors.outline,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 32,
    }
});
