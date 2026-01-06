import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { JuzAssignment } from '@/types/juz';
import { theme } from '@/config/theme';
import clsx from 'clsx';
import { useCompleteJuz } from '@/features/juz/hooks/useJuz';

interface JuzCardProps {
    assignment: JuzAssignment;
}

export const JuzCard: React.FC<JuzCardProps> = ({ assignment }) => {
    const completeMutation = useCompleteJuz();

    const isCompleted = assignment.status === 'completed';
    const isOverdue = assignment.status === 'overdue';

    const handleComplete = () => {
        completeMutation.mutate(assignment.id);
    };

    const statusColor = isCompleted
        ? theme.colors.secondary
        : isOverdue
            ? theme.colors.error
            : theme.colors.primary;

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={[styles.badge, { backgroundColor: statusColor }]}>
                    <Text style={styles.badgeText}>{assignment.juzNumber}. CÜZ</Text>
                </View>
                <Text style={[styles.statusText, { color: statusColor }]}>
                    {isCompleted ? 'Tamamlandı' : isOverdue ? 'Gecikti' : 'Okunuyor'}
                </Text>
            </View>

            <Text style={styles.dateLabel}>Son Okuma Tarihi:</Text>
            <Text style={styles.dateValue}>
                {new Date(assignment.dueDate).toLocaleDateString('tr-TR')}
            </Text>

            {!isCompleted && (
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleComplete}
                    disabled={completeMutation.isPending}
                >
                    <Text style={styles.buttonText}>
                        {completeMutation.isPending ? 'İşleniyor...' : 'Tamamladım'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.roundness.medium,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.outline + '40', // %25 opacity
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    badge: {
        paddingHorizontal: theme.spacing.s,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.roundness.small,
    },
    badgeText: {
        color: theme.colors.onPrimary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    statusText: {
        fontWeight: '600',
        fontSize: 14,
    },
    dateLabel: {
        fontSize: 12,
        color: theme.colors.onSurfaceVariant,
        marginTop: theme.spacing.xs,
    },
    dateValue: {
        fontSize: 16,
        color: theme.colors.onSurface,
        fontWeight: '500',
        marginBottom: theme.spacing.m,
    },
    button: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.m,
        borderRadius: theme.roundness.medium,
        alignItems: 'center',
    },
    buttonText: {
        color: theme.colors.onPrimary,
        fontWeight: 'bold',
    },
});
