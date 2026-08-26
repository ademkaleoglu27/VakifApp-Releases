import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Transaction } from '@/types/accounting';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';

interface TransactionCardProps {
    transaction: Transaction;
    onDelete?: () => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onDelete }) => {
    const isIncome = transaction.type === 'income';
    const color = isIncome ? theme.colors.secondary : theme.colors.error;
    const sign = isIncome ? '+' : '-';

    const handleDeletePress = () => {
        if (onDelete) {
            Alert.alert(
                'İşlemi Sil',
                'Bu işlemi silmek istediğinizden emin misiniz?',
                [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'Sil', style: 'destructive', onPress: onDelete }
                ]
            );
        }
    };

    return (
        <View style={[styles.card, { borderLeftColor: color }]}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.category}>{transaction.category}</Text>
                    <Text style={styles.date}>
                        {new Date(transaction.date).toLocaleDateString('tr-TR')}
                    </Text>
                </View>
                <Text style={styles.description}>{transaction.description}</Text>
            </View>

            <View style={styles.rightSection}>
                <View style={styles.amountContainer}>
                    <Text style={[styles.amount, { color }]}>
                        {sign} {transaction.amount.toLocaleString('tr-TR')} {transaction.currency}
                    </Text>
                    <Text style={styles.method}>
                        {transaction.payment_method === 'cash' ? 'Nakit' :
                            transaction.payment_method === 'credit_card' ? 'Kredi Kartı' : 'Havale'}
                    </Text>
                </View>

                {onDelete && (
                    <TouchableOpacity onPress={handleDeletePress} style={styles.deleteButton}>
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.roundness.medium,
        marginBottom: theme.spacing.s,
        borderLeftWidth: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    content: {
        flex: 1,
        marginRight: theme.spacing.m,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    category: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.onSurface,
    },
    date: {
        fontSize: 12,
        color: theme.colors.onSurfaceVariant,
    },
    description: {
        fontSize: 14,
        color: theme.colors.onSurfaceVariant,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    method: {
        fontSize: 10,
        color: theme.colors.onSurfaceVariant,
        marginTop: 2,
    },
    rightSection: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 50 // roughly card height to distribute space
    },
    deleteButton: {
        padding: 4,
        marginTop: 4
    }
});
