import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useDecisions } from '@/features/announcements/hooks/useDecisions';
import { theme } from '@/config/theme';
import { Decision } from '@/types/decision';
import { DecisionLinkedReadings } from '@/features/announcements/components/DecisionLinkedReadings';

export const DecisionsScreen = () => {
    const { data: decisions, isLoading } = useDecisions();

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const renderItem = ({ item }: { item: Decision }) => (
        <View style={styles.card}>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.summary}>{item.summary}</Text>
            <DecisionLinkedReadings decisionId={item.id} />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={decisions}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <Text style={styles.headerTitle}>Meşveret Kararları</Text>
                }
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Görüntülenecek karar bulunmamaktadır.</Text>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: theme.spacing.m,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: theme.spacing.m,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.roundness.medium,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.outline + '40',
    },
    date: {
        fontSize: 12,
        color: theme.colors.onSurfaceVariant,
        marginBottom: theme.spacing.xs,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.onSurface,
        marginBottom: theme.spacing.xs,
    },
    category: {
        fontSize: 12,
        color: theme.colors.secondary,
        fontWeight: 'bold',
        marginBottom: theme.spacing.s,
        textTransform: 'uppercase',
    },
    summary: {
        fontSize: 14,
        color: theme.colors.onSurfaceVariant,
        lineHeight: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.onSurfaceVariant,
        marginTop: theme.spacing.xl,
        fontSize: 16,
    },
});
