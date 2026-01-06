import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, FlatList, Modal, TextInput, Alert, Platform, Image } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native';
import { useSync } from '@/hooks/dbHooks';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { LinearGradient } from 'expo-linear-gradient';
import { RISALE_BOOKS } from '@/config/risaleSources';
import { canAccess } from '@/config/permissions';
import { PageStepper } from '@/components/PageStepper';

export const HomeScreen = () => {
    const { user } = useAuthStore();
    const navigation = useNavigation<any>();

    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const openDrawer = () => {
        navigation.dispatch(DrawerActions.openDrawer());
    };

    // Add Reading State
    const [isModalVisible, setModalVisible] = useState(false);
    const [contacts, setContacts] = useState<any[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [pages, setPages] = useState('');

    const syncMutation = useSync();

    useFocusEffect(
        useCallback(() => {
            // Load data for display
            loadLeaderboard();
            loadContacts();

            // Sync in background without blocking or aggressive refetching
            // syncMutation.mutate(); // Removed to prevent navigation stutter. SyncService handles periodic sync.
        }, [])
    );

    // Helper: Calculate Last Monday 12:00
    const getLastMondayNoon = () => {
        const now = new Date();
        const day = now.getDay(); // 0 (Sun) to 6 (Sat)

        // Days to subtract to get to Monday (1)
        // If today is Sunday (0): (0 - 1 + 7) % 7 = 6 days ago
        // If today is Monday (1): (1 - 1 + 7) % 7 = 0 days ago
        // If today is Tuesday (2): (2 - 1 + 7) % 7 = 1 day ago
        const diff = (day - 1 + 7) % 7;

        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - diff);
        lastMonday.setHours(12, 0, 0, 0);

        // If today is Monday but BEFORE 12:00, we fall back to PREVIOUS week's Monday
        // Because the new week hasn't started yet (according to the rule)
        if (now < lastMonday) {
            lastMonday.setDate(lastMonday.getDate() - 7);
        }

        return lastMonday.toISOString();
    };

    const loadLeaderboard = async () => {
        // Don't show full loading spinner for refresh to keep UI smooth
        // setIsLoading(true); 

        // Cleanup is expensive, maybe move to App init or occasional background task?
        // for now, just removing the await to let it run parallel if needed, or removing entirely if redundant.
        // await RisaleUserDb.cleanupDummies(); 

        const startDate = getLastMondayNoon();
        console.log('Fetching leaderboard since:', startDate);

        // Pass the start date to filter by week
        let data = await RisaleUserDb.getLeaderboard(startDate);
        setLeaderboard(data);
        setIsLoading(false);
    };

    // seedDummyData removed.

    const loadContacts = async () => {
        if (!user || !canAccess(user.role, 'VIEW_COUNCIL_DECISIONS')) return;
        try {
            const data = await RisaleUserDb.getContacts();
            setContacts(data);
        } catch (error) {

        }
    };


    // ... existing imports

    const handleAddReading = async () => {
        // PERMISSION CHECK for Proxy Entry
        if (!canAccess(user?.role || 'sohbet_member', 'MESVERET_SCREEN')) {
            Alert.alert('Yetkisiz İşlem', 'Başkası adına okuma ekleme yetkiniz yok.');
            return;
        }

        if (!selectedContactId || !pages) {
            Alert.alert('Hata', 'Kişi ve sayfa sayısı seçilmelidir.');
            return;
        }

        const bookName = selectedBookId ? RISALE_BOOKS.find(b => b.id === selectedBookId)?.title : undefined;

        try {
            await RisaleUserDb.addContactReading(selectedContactId, parseInt(pages || '0'));
            setModalVisible(false);
            setPages('');
            setSelectedBookId(null);
            setSelectedContactId(null);
            setLeaderboard([]); // Clear to force reload
            loadLeaderboard();
            Alert.alert('Başarılı', 'Okuma eklendi.');
        } catch (e) {
            Alert.alert('Hata', 'Ekleme başarısız.');
            console.error(e);
        }
    };


    // Data Splitting
    const topThree = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3);

    const renderPodiumItem = (item: any, rank: number) => {
        if (!item) return <View style={styles.podiumPlace} />;

        const isFirst = rank === 0;
        const place = rank === 0 ? 1 : (rank === 1 ? 2 : 3);

        // Colors for gradients
        const goldColors = ['#FFD700', '#FDB931', '#F59E0B'];
        const silverColors = ['#E0E0E0', '#BDBDBD', '#9E9E9E'];
        const bronzeColors = ['#E6A869', '#CD7F32', '#8E5A2D'];

        const colors = isFirst ? goldColors : (rank === 1 ? silverColors : bronzeColors);
        const size = isFirst ? 88 : 64; // Bigger avatar for #1
        const stepHeight = isFirst ? 60 : (rank === 1 ? 40 : 30); // Increased height for better visibility
        const fontSize = isFirst ? 32 : (rank === 1 ? 24 : 18); // Dynamic font size

        return (
            <View style={styles.podiumPlace}>
                <View style={styles.avatarContainer}>
                    {isFirst && (
                        <View style={styles.crownContainer}>
                            <Ionicons name="happy" size={28} color="#FFD700" />
                        </View>
                    )}

                    <LinearGradient
                        colors={colors as any}
                        style={[styles.avatarBorder, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]}
                    >
                        <View style={[styles.avatarInner, { width: size, height: size, borderRadius: size / 2 }]}>
                            <Text style={[styles.avatarText, { fontSize: isFirst ? 28 : 20 }]}>
                                {item.name[0]}
                            </Text>
                        </View>
                    </LinearGradient>

                    <View style={[styles.rankBadge, { backgroundColor: colors[1], borderColor: '#fff' }]}>
                        <Text style={styles.rankBadgeText}>{place}</Text>
                    </View>
                </View>

                <Text style={[styles.podiumName, isFirst && styles.podiumNameFirst]} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.podiumPages}>{item.total_pages} sayfa</Text>

                {/* The Physical Podium Step */}
                <LinearGradient
                    colors={[colors[2], colors[0]]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.podiumStep, { height: stepHeight, justifyContent: 'center' }]}
                >
                    <Text style={[styles.stepNumber, { fontSize }]}>{place}</Text>
                </LinearGradient>
            </View>
        );
    };

    const Podium = () => (
        <View style={styles.podiumContainer}>
            {/* Rank 2 (Left) */}
            <View style={styles.podiumColumn}>{renderPodiumItem(topThree[1], 1)}</View>
            {/* Rank 1 (Center) */}
            <View style={[styles.podiumColumn, { marginHorizontal: 4, zIndex: 10 }]}>{renderPodiumItem(topThree[0], 0)}</View>
            {/* Rank 3 (Right) */}
            <View style={styles.podiumColumn}>{renderPodiumItem(topThree[2], 2)}</View>
        </View>
    );

    const renderCompactRow = ({ item, index }: { item: any, index: number }) => {
        const rank = index + 4; // Since we skip top 3
        return (
            <View style={styles.compactRow}>
                <Text style={styles.compactRank}>#{rank}</Text>
                <View style={styles.compactAvatar}>
                    <Text style={styles.compactAvatarText}>{item.name[0]}</Text>
                </View>
                <Text style={styles.compactName}>{item.name} {item.surname}</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.compactPages}>{item.total_pages} Sayfa</Text>
            </View>
        );
    };



    // ... imports match existing ...

    // Construct Name Display
    const displayName = user?.name ? `${user.name.split(' ')[0]} Abi` : 'Kardeşim';
    const insets = { top: Platform.OS === 'ios' ? 50 : 30 }; // Fallback safe area

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Premium Header Background */}
            <View style={styles.headerBackground} pointerEvents="none">
                <LinearGradient
                    colors={[theme.colors.primary, '#0f766e']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.decorativeCircle} />
            </View>

            {/* Header Content */}
            <View style={[styles.headerArea, { paddingTop: insets.top }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={openDrawer}
                        style={styles.menuButton}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="menu" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.welcomeContainer}>
                        <Text style={styles.welcomeText}>Hayırlı Günler,</Text>
                        <Text style={styles.userName}>{displayName}</Text>
                    </View>
                </View>
                {/* Optional: Add profile img or icon here */}
            </View>

            {/* Main White Card Content */}
            <View style={styles.cardContent}>

                {/* Quote of the Day */}
                <View style={styles.quoteContainer}>
                    <View style={styles.quoteIcon}>
                        <Ionicons name="chatbox-ellipses" size={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.quoteText} numberOfLines={3}>"Güzel gören güzel düşünür. Güzel düşünen, hayatından lezzet alır."</Text>
                        <Text style={styles.quoteSource}>- Mektubat</Text>
                    </View>
                </View>

                {/* Dashboard Content */}
                <View style={styles.dashboardContent}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Haftalık Sıralama</Text>
                        {/* Add Reading Button removed as per user request */}
                    </View>

                    {/* Podium & List */}
                    <FlatList
                        data={others}
                        renderItem={renderCompactRow}
                        keyExtractor={(item) => item.id}
                        ListHeaderComponent={<Podium />}
                        contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>Henüz sıralama yok.</Text>
                            </View>
                        }
                    />
                </View>
            </View>

            {/* Add Reading Modal (Admin Only) */}
            <Modal visible={isModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Kişi Adına Okuma Ekle</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Kişi Seçimi</Text>
                        <View style={{ maxHeight: 150 }}>
                            <FlatList
                                data={contacts}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.chip, selectedContactId === item.id && styles.chipSelected, { marginBottom: 8 }]}
                                        onPress={() => setSelectedContactId(item.id)}
                                    >
                                        <Text style={[styles.chipText, selectedContactId === item.id && styles.chipTextSelected]}>
                                            {item.name} {item.surname}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                nestedScrollEnabled={true}
                            />
                        </View>

                        <PageStepper
                            value={pages}
                            onChange={setPages}
                            label="Sayfa Sayısı"
                            step={10}
                        />

                        <TouchableOpacity style={styles.btnSave} onPress={handleAddReading}>
                            <Text style={styles.btnSaveText}>KAYDET</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerBackground: {
        height: '35%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: theme.colors.primary,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
    },
    decorativeCircle: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(255,255,255,0.1)',
        transform: [{ scale: 1.5 }],
    },
    headerArea: {
        paddingHorizontal: 24,
        marginBottom: 20,
        zIndex: 50, // Ensure it's above absolute background
        position: 'relative', // Establish stacking context
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    menuButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        zIndex: 60, // Ensure button itself is top-most
    },
    welcomeContainer: {
        justifyContent: 'center'
    },
    welcomeText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
    userName: { color: '#fff', fontSize: 24, fontWeight: 'bold', letterSpacing: 0.5 },

    cardContent: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20, // Reduced from 24
        paddingTop: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },

    quoteContainer: {
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    quoteIcon: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme.colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    quoteText: { fontSize: 13, color: '#334155', fontStyle: 'italic', lineHeight: 20, fontWeight: '500' },
    quoteSource: { fontSize: 11, color: theme.colors.primary, fontWeight: 'bold', marginTop: 4, textAlign: 'right' },

    dashboardContent: {
        flex: 1,
    },

    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, paddingHorizontal: 4
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', letterSpacing: 0.5 },
    addBtnSmall: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
    },
    addLink: { fontSize: 12, fontWeight: 'bold', color: '#fff' },

    // Podium Styles
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginBottom: 24, // Reduced
        paddingHorizontal: 8,
    },
    podiumColumn: { alignItems: 'center', justifyContent: 'flex-end', width: '31%' },
    podiumPlace: { alignItems: 'center', width: '100%', justifyContent: 'flex-end' },

    avatarContainer: { alignItems: 'center', marginBottom: 8 },
    crownContainer: { position: 'absolute', top: -32, zIndex: 10 },

    avatarBorder: {
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3
    },
    avatarInner: { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontWeight: '900', color: theme.colors.primary },

    rankBadge: {
        position: 'absolute', bottom: -8, width: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center', borderWidth: 2
    },
    rankBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    podiumName: { fontSize: 12, fontWeight: 'bold', color: '#334155', marginTop: 6, textAlign: 'center' },
    podiumNameFirst: { fontSize: 14, color: theme.colors.primary, marginTop: 8 },
    podiumPages: { fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: '600' },

    podiumStep: {
        width: '100%',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        alignItems: 'center',
    },
    stepNumber: { color: 'rgba(255,255,255,0.7)', fontWeight: '900', includeFontPadding: false, textAlignVertical: 'center' },

    // Compact Row Styles
    compactRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f8fafc', paddingVertical: 12, paddingHorizontal: 16,
        borderRadius: 16, marginBottom: 8,
        borderWidth: 1, borderColor: '#e2e8f0'
    },
    compactRank: { width: 30, fontSize: 14, fontWeight: 'bold', color: '#94a3b8' },
    compactAvatar: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: '#e2e8f0',
        alignItems: 'center', justifyContent: 'center', marginRight: 12
    },
    compactAvatarText: { fontSize: 14, fontWeight: 'bold', color: '#475569' },
    compactName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
    compactPages: { fontSize: 13, fontWeight: 'bold', color: theme.colors.primary },

    emptyContainer: { alignItems: 'center', marginTop: 30 },
    emptyText: { color: '#94a3b8' },

    // Modal (Minimalist)
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    closeBtn: { padding: 4, backgroundColor: '#F8FAFC', borderRadius: 12 },

    label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

    chip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: 'transparent'
    },
    chipSelected: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
    chipText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
    chipTextSelected: { color: '#B45309', fontWeight: 'bold' },

    btnSave: {
        backgroundColor: theme.colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16,
        alignItems: 'center', alignSelf: 'center', marginTop: 20
    },
    btnSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
