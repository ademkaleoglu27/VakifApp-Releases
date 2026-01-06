import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useTransactions, useSync, useDeleteTransaction } from '@/hooks/dbHooks';
import { TransactionCard } from '@/features/accounting/components/TransactionCard';
import { theme } from '@/config/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { PremiumHeader } from '@/components/PremiumHeader';
import { Ionicons } from '@expo/vector-icons';
import { requireFeature } from '@/utils/guard';
import { NoAccess } from '@/components/NoAccess';
import { useAuthStore } from '@/store/authStore';
import { canAccess } from '@/config/permissions';

export const AccountingScreen = () => {
    if (!requireFeature('ACCOUNTING_SCREEN')) return <NoAccess />;

    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { user } = useAuthStore();
    const { data: rawTransactions, isLoading } = useTransactions();
    const syncMutation = useSync();
    const deleteTxMutation = useDeleteTransaction();

    const canManage = user ? canAccess(user.role, 'MANAGE_ACCOUNTING') : false;
    const canViewDetails = user ? canAccess(user.role, 'VIEW_ACCOUNTING_DETAILS') : false;

    // Auto-Sync on Mount
    React.useEffect(() => {
        syncMutation.mutate();
    }, []);

    const handleDelete = (id: string) => {
        deleteTxMutation.mutate(id);
    };

    const transactions = rawTransactions?.map(t => ({
        ...t,
        createdBy: t.created_by,
        paymentMethod: t.payment_method as any,
        // Privacy Masking: If cannot view details and it's an 'income' (likely dues), hide specifics
        // However, user asked to specifically hide "who paid how much". 
        // We will mask description/name if unauthorized.
        description: canViewDetails ? (t.description || undefined) : (t.type === 'income' ? 'Gelir (Gizli)' : 'Gider'),
        contact_id: canViewDetails ? t.contact_id : undefined // Hide contact link
    }));

    // Date Filtering State
    const [currentDate, setCurrentDate] = useState(new Date());

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Filter Logic
    const filteredTransactions = transactions?.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear();
    }) || [];

    // Calculate Summary Dynamically
    const monthlySummary = filteredTransactions.reduce((acc, curr) => {
        if (curr.type === 'income') acc.totalIncome += curr.amount;
        else acc.totalExpense += curr.amount;
        return acc;
    }, { totalIncome: 0, totalExpense: 0, balance: 0 });
    monthlySummary.balance = monthlySummary.totalIncome - monthlySummary.totalExpense;

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="Muhasebe"
                backButton
            >
                <View style={styles.dateSelector}>
                    <TouchableOpacity onPress={goToPreviousMonth} style={styles.arrowBtn}>
                        <Ionicons name="chevron-back" size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.dateDisplay}>
                        <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" style={{ marginRight: 6 }} />
                        <Text style={styles.dateText}>
                            {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={goToNextMonth} style={styles.arrowBtn}>
                        <Ionicons name="chevron-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </PremiumHeader>

            <View style={styles.content}>
                {/* Monthly Summary Card */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Aylık Durum</Text>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Gelir</Text>
                            <Text style={[styles.summaryValue, { color: theme.colors.secondary }]}>
                                +{monthlySummary.totalIncome.toLocaleString()} ₺
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Gider</Text>
                            <Text style={[styles.summaryValue, { color: theme.colors.error }]}>
                                -{monthlySummary.totalExpense.toLocaleString()} ₺
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Bakiye</Text>
                            <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                                {monthlySummary.balance.toLocaleString()} ₺
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.listHeader}>
                    <Text style={styles.sectionTitle}>Son İşlemler</Text>
                </View>

                <FlatList
                    data={filteredTransactions}
                    keyExtractor={(item, index) => item.id || `transaction-${index}`}
                    renderItem={({ item }) => (
                        <TransactionCard
                            transaction={item}
                            onDelete={canManage ? () => handleDelete(item.id) : undefined}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Bu ay için işlem bulunamadı.</Text>
                        </View>
                    }
                />
            </View>

            {canManage && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('AddTransaction')}
                >
                    <Ionicons name="add" size={32} color={theme.colors.onPrimary} />
                </TouchableOpacity>
            )}
        </View>
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
    content: {
        flex: 1,
        marginTop: -20, // Overlap Header
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        padding: 4,
        marginTop: 4,
        alignSelf: 'flex-start' // Left aligned or center? User image shows header. Let's keep it clean.
    },
    arrowBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
    },
    dateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        minWidth: 140,
        justifyContent: 'center'
    },
    dateText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        textTransform: 'capitalize'
    },

    // Card Styles
    summaryCard: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.m,
        padding: theme.spacing.m,
        borderRadius: theme.roundness.medium,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.onSurface,
        marginBottom: theme.spacing.m,
        textAlign: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryLabel: {
        fontSize: 12,
        color: theme.colors.onSurfaceVariant,
        marginBottom: 2,
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    divider: {
        width: 1,
        backgroundColor: theme.colors.outline + '40',
    },

    listHeader: {
        paddingHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.s,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.onSurface,
    },
    list: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: 100,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
        padding: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.onSurfaceVariant,
        fontSize: 16,
    },

    fab: {
        position: 'absolute',
        bottom: theme.spacing.l,
        right: theme.spacing.l,
        backgroundColor: theme.colors.primary,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
});
