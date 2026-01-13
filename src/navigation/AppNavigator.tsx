import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { getEnabledBooks } from '@/config/booksRegistry';
import * as Notifications from 'expo-notifications';

// VP Reader Screens (Production)
import { RisaleVirtualPageSectionList } from '@/features/reader/screens/RisaleVirtualPageSectionList';
import { RisaleVirtualPageReaderScreen } from '@/features/reader/screens/RisaleVirtualPageReaderScreen';


import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import { JuzTrackingScreen } from '@/features/juz/screens/JuzTrackingScreen';
import { AddReadingLogScreen } from '@/features/risale/screens/AddReadingLogScreen';
import { AnnouncementsScreen } from '@/features/announcements/screens/AnnouncementsScreen';
import { DecisionsScreen } from '@/features/mesveret/screens/DecisionsScreen';
import { AccountingScreen } from '@/features/accounting/screens/AccountingScreen';
import { AddTransactionScreen } from '@/features/accounting/screens/AddTransactionScreen';
import { useAuthStore } from '@/store/authStore';
import { requireFeature } from '@/utils/guard';
import { notificationService } from '@/services/notificationService';
import { NotificationsScreen } from '@/features/notifications/screens/NotificationsScreen';
import { DutyDashboardScreen } from '@/features/duties/screens/DutyDashboardScreen';
import { DutyListScreen } from '@/features/duties/screens/DutyListScreen';
import { DutyPoolDetailScreen } from '@/features/duties/screens/DutyPoolDetailScreen';
import { AudioProvider } from '@/context/AudioContext';
import { MiniPlayer } from '@/components/MiniPlayer';

// Phase 2 Screen Imports
import { LibraryScreen } from '@/features/library/screens/LibraryScreen';
import { CouncilScreen } from '@/features/council/screens/CouncilScreen';
import { ContactsScreen } from '@/features/mesveret/screens/ContactsScreen';
// import { AssignmentListScreen } from '@/features/assignments/screens/AssignmentListScreen'; // Replaced
import { ReadingTrackingScreen } from '@/features/tracking/screens/ReadingTrackingScreen';
import { AgendaScreen } from '@/features/agenda/screens/AgendaScreen';
import { AboutScreen } from '@/features/dashboard/screens/AboutScreen';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';

// Quran Screens
import { QuranHomeScreen } from '@/features/library/screens/QuranHomeScreen';
import { QuranPageReaderScreen } from '@/features/library/screens/QuranPageReaderScreen';
import { QuranSurahListScreen } from '@/features/library/screens/QuranSurahListScreen';
import { QuranPagePickerScreen } from '@/features/library/screens/QuranPagePickerScreen';
import { QuranJuzPickerScreen } from '@/features/library/screens/QuranJuzPickerScreen';
import { LibraryDetailScreen } from '@/features/library/screens/LibraryDetailScreen';
import { WorkDetailScreen } from '@/features/library/screens/WorkDetailScreen';

// Risale Screens
// import { RisaleHomeScreen } from '@/features/risale/screens/RisaleHomeScreen'; // REMOVED

import { HatimDuasiScreen } from '@/features/library/screens/HatimDuasiScreen';
import { RisaleSearchScreen } from '@/features/library/screens/RisaleSearchScreen';
import { RisaleMyNotesScreen } from '@/features/library/screens/RisaleMyNotesScreen';
import { ReadingHistoryScreen } from '@/features/risale/screens/ReadingHistoryScreen';
import { CevsenScreen } from '@/features/library/screens/CevsenScreen';
import { CevsenLandingScreen } from '@/features/library/screens/CevsenLandingScreen';
import { DictionaryScreen } from '@/features/library/screens/DictionaryScreen';
import { TesbihatLandingScreen } from '@/features/tesbihat/screens/TesbihatLandingScreen';
import { DualarLandingScreen } from '@/features/library/screens/DualarLandingScreen';


import { TesbihatPlayerScreen } from '@/features/tesbihat/screens/TesbihatPlayerScreen';


if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export type RootStackParamList = {
    DrawerRoot: undefined;
    Login: undefined;
    JuzTracking: undefined;
    AddReadingLog: undefined;
    Announcements: undefined;
    Decisions: undefined;
    Contacts: undefined;
    Accounting: undefined;
    AddTransaction: undefined;
    ReadingTracking: undefined;
    Agenda: undefined;

    // VP Reader (World Standard)
    RisaleVirtualPageSectionList: {
        bookId?: string;
        version?: string;
        workId?: string; // Legacy Bridge 
        workTitle?: string; // Legacy Bridge 
    };
    RisaleVirtualPageReader: {
        bookId?: string;
        version?: string;
        workId?: string; // Legacy Bridge
        workTitle?: string;
        sectionId?: string; // UID or ID

        // Optional navigation context
        source?: 'toc' | 'resume';
        mode?: 'section' | 'resume';

        // Resume coordinates (for 'resume' mode)
        resumeLocation?: {
            streamIndex: number;
            sectionId?: string;
        };
    };

    // Library Screens
    QuranSurahList: undefined;
    QuranHomeScreen: undefined;
    QuranPageReader: { page: number };

    // Risale Library V1
    LibraryDetail: { libraryId: string };
    WorkDetail: { workId: string };
    QuranPagePicker: undefined;
    QuranJuzPicker: undefined;

    // Risale Screens



    Cevsen: { initialPage?: number };
    CevsenLanding: undefined;
    Lugat: undefined;

    RisaleSearch: undefined;
    RisaleMyNotes: undefined;
    ReadingHistory: undefined;
    Notifications: undefined;
    DutyDashboard: undefined;
    DutyList: undefined;
    DutyPoolDetail: { poolId: string; poolName: string };

    // Tesbihat
    TesbihatLanding: undefined;
    TesbihatPlayer: { title: string; tracks: any[] };

    // Dualar
    DualarLanding: undefined;
    HatimDuasi: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    JuzTracking: undefined;
    Readings: undefined;
    Duyurular: undefined;
};

export type DrawerParamList = {
    MainTabs: undefined;
    Library: undefined;
    Cevsen: undefined;
    Lugat: undefined;
    CouncilMeşveret: undefined;
    CouncilSohbet: undefined;
    Assignments: undefined;
    ReadingTracking: undefined;
    Agenda: undefined;
    Tesbihat: undefined;
    About: undefined;
};



const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

const MainTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'home';
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'JuzTracking') iconName = focused ? 'book' : 'book-outline';
                    else if (route.name === 'Readings') iconName = focused ? 'add-circle' : 'add-circle-outline';
                    else if (route.name === 'Duyurular') iconName = focused ? 'megaphone' : 'megaphone-outline';

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.colors.primary, // Emerald for active
                tabBarInactiveTintColor: '#94a3b8', // Slate-400 for inactive
                tabBarStyle: {
                    backgroundColor: '#ffffff', // White background
                    borderTopWidth: 0,
                    elevation: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                },
                tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginBottom: 4 }
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
            <Tab.Screen name="JuzTracking" component={JuzTrackingScreen} options={{ title: 'Cüz Takibi' }} />
            <Tab.Screen name="Readings" component={AddReadingLogScreen} options={{ title: 'Günlük Okuma' }} />
            <Tab.Screen name="Duyurular" component={AnnouncementsScreen} options={{ title: 'Duyurular' }} />
        </Tab.Navigator>
    );
};

// Placeholder Screens for Phase 2
const PlaceholderScreen = ({ title }: { title: string }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <Text style={{ fontSize: 20, color: '#1e293b', fontWeight: 'bold' }}>{title}</Text>
        <Text style={{ marginTop: 8, color: '#64748b' }}>Yapım Aşamasında...</Text>
    </View>
);

// Named placeholder components to avoid inline function warning
const CevsenPlaceholderScreen = () => <PlaceholderScreen title="Cevsen" />;
// const LugatPlaceholderScreen = () => <PlaceholderScreen title="Lugat" />;

const CustomDrawerContent = React.memo((props: any) => {
    const { user, logout } = useAuthStore();
    const [isCouncilExpanded, setIsCouncilExpanded] = useState(false);
    const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);

    const toggleCouncil = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsCouncilExpanded(!isCouncilExpanded);
    };

    const navigate = (screen: string, params?: object) => {
        // Close drawer first for smoother animation, then navigate
        props.navigation.closeDrawer();
        requestAnimationFrame(() => {
            props.navigation.navigate(screen, params);
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.primary }}>
            {/* Header Background Gradient - Static if possible */}
            <LinearGradient
                colors={[theme.colors.primary, '#0f766e']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                pointerEvents="none"
            />
            {/* ... rest of the code is same structure, effectively validating the diff ... */}
            {/* Copying the body from original but using the updated navigate function */}

            {/* Decorative Circle */}
            <View style={drawerStyles.decorativeCircle} pointerEvents="none" />

            {/* Content Area */}
            <View style={{ flex: 1, paddingTop: 50, zIndex: 10 }}>
                {/* Premium Brand Header */}
                <View style={drawerStyles.header}>
                    <View style={drawerStyles.headerRow}>
                        <View>
                            <Text style={drawerStyles.brandTitle}>Nur</Text>
                            <Text style={drawerStyles.brandSubtitle}>Mektebi</Text>
                        </View>
                    </View>

                    <View style={drawerStyles.userInfo}>
                        <Text style={drawerStyles.userName}>{user?.name}</Text>
                        <View style={drawerStyles.roleBadge}>
                            <Text style={drawerStyles.userRole}>{user?.group || 'MİSAFİR'}</Text>
                        </View>
                    </View>
                </View>

                {/* White Card Body */}
                <View style={drawerStyles.cardContent}>
                    <DrawerContentScrollView
                        {...props}
                        contentContainerStyle={{ paddingTop: 10, paddingBottom: 50 }}
                        scrollEnabled={true}
                        nestedScrollEnabled={true}
                    >
                        {/* Navigation Items */}
                        <View style={drawerStyles.itemsContainer}>

                            {/* Ana Sayfa */}
                            <DrawerItem
                                label="Ana Sayfa"
                                icon="home-outline"
                                onPress={() => navigate('MainTabs')}
                                color="#334155"
                            />

                            {/* Kütüphane Accordion */}
                            <TouchableOpacity style={drawerStyles.accordionHeader} onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setIsLibraryExpanded(!isLibraryExpanded);
                            }} activeOpacity={0.7}>
                                <View style={drawerStyles.row}>
                                    <Ionicons name="library-outline" size={24} color="#334155" />
                                    <Text style={drawerStyles.accordionLabel}>Kütüphane</Text>
                                </View>
                                <Ionicons
                                    name={isLibraryExpanded ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color="#94a3b8"
                                />
                            </TouchableOpacity>

                            {isLibraryExpanded && (
                                <View style={drawerStyles.accordionBody}>
                                    <DrawerItem
                                        label="Kuran-ı Kerim"
                                        icon="book-outline"
                                        onPress={() => navigate('QuranHomeScreen')}
                                        isSubItem
                                        color="#334155"
                                    />

                                    {/* Risale-i Nur Library V1 Link */}
                                    <DrawerItem
                                        label="Risale-i Nur"
                                        icon="library-outline"
                                        onPress={() => navigate('LibraryDetail', { libraryId: 'risale_nur' })}
                                        isSubItem
                                        color="#334155"
                                    />
                                    <DrawerItem
                                        label="Cevşen"
                                        icon="shield-checkmark-outline"
                                        onPress={() => navigate('CevsenLanding')}
                                        isSubItem
                                        color="#334155"
                                    />
                                    <DrawerItem
                                        label="Lügat"
                                        icon="search-outline"
                                        onPress={() => navigate('Lugat')}
                                        isSubItem
                                        color="#334155"
                                    />
                                    <DrawerItem
                                        label="Tesbihat"
                                        icon="musical-notes-outline"
                                        onPress={() => navigate('TesbihatLanding')}
                                        isSubItem
                                        color="#334155"
                                    />
                                    <DrawerItem
                                        label="Dualar"
                                        icon="hand-left-outline"
                                        onPress={() => navigate('DualarLanding')}
                                        isSubItem
                                        color="#334155"
                                    />
                                </View>
                            )}

                            {/* Meşveret Accordion */}
                            {requireFeature('MESVERET_SCREEN') && (
                                <>
                                    <TouchableOpacity style={drawerStyles.accordionHeader} onPress={toggleCouncil} activeOpacity={0.7}>
                                        <View style={drawerStyles.row}>
                                            <Ionicons name="people-outline" size={24} color="#334155" />
                                            <Text style={drawerStyles.accordionLabel}>Meşveret</Text>
                                        </View>
                                        <Ionicons
                                            name={isCouncilExpanded ? "chevron-up" : "chevron-down"}
                                            size={20}
                                            color="#94a3b8"
                                        />
                                    </TouchableOpacity>

                                    {isCouncilExpanded && (
                                        <View style={drawerStyles.accordionBody}>
                                            <DrawerItem
                                                label="Kararlar"
                                                icon="document-text-outline"
                                                onPress={() => navigate('Decisions')}
                                                isSubItem
                                                color="#334155"
                                            />
                                            <DrawerItem
                                                label="Heyet Listesi (Kişiler)"
                                                icon="list-outline"
                                                onPress={() => navigate('Contacts')}
                                                isSubItem
                                                color="#334155"
                                            />
                                        </View>
                                    )}
                                </>
                            )}

                            {/* Görevlendirmeler */}
                            <DrawerItem
                                label="Görevlendirmeler"
                                icon="checkbox-outline"
                                onPress={() => navigate('Assignments')}
                                color="#334155"
                            />

                            {/* Nöbet Yönetimi */}
                            {requireFeature('MESVERET_SCREEN') && (
                                <DrawerItem
                                    label="Nöbet Yönetimi"
                                    icon="construct-outline"
                                    onPress={() => navigate('DutyList')}
                                    color="#b45309"
                                />
                            )}

                            {/* Okuma Takibi */}
                            <DrawerItem
                                label="Okuma Takibi"
                                icon="stats-chart-outline"
                                onPress={() => navigate('ReadingTracking')}
                                color="#334155"
                            />

                            {/* Ajanda */}
                            <DrawerItem
                                label="Ajanda"
                                icon="calendar-outline"
                                onPress={() => navigate('Agenda')}
                                color="#334155"
                            />

                            {/* Muhasebe */}
                            {requireFeature('ACCOUNTING_SCREEN') && (
                                <DrawerItem
                                    label="Muhasebe"
                                    icon="wallet-outline"
                                    onPress={() => navigate('Accounting')}
                                    color="#334155"
                                />
                            )}

                            {/* Profile & Settings */}
                            <View style={drawerStyles.divider} />

                            <DrawerItem
                                label="Ayarlar"
                                icon="settings-outline"
                                onPress={() => { }}
                                color="#334155"
                            />

                            {/* Rehber & Hakkında */}
                            <DrawerItem
                                label="Rehber & Hakkında"
                                icon="information-circle-outline"
                                onPress={() => navigate('About')}
                                color="#334155"
                            />

                            <DrawerItem
                                label="Çıkış Yap"
                                icon="log-out-outline"
                                color="#ef4444"
                                onPress={() => {
                                    props.navigation.closeDrawer();
                                    logout();
                                }}
                            />

                        </View>
                    </DrawerContentScrollView>

                    <View style={drawerStyles.footer}>
                        <Text style={drawerStyles.version}>VakıfApp v2.0 Premium</Text>
                    </View>
                </View>
            </View>
        </View>
    );
});

// Helper Component for consistent items (Memoized)
const DrawerItem = React.memo(({ label, icon, onPress, color, isSubItem }: any) => (
    <TouchableOpacity
        style={[drawerStyles.item, isSubItem && drawerStyles.subItem]}
        onPress={onPress}
        activeOpacity={0.7}
        delayPressIn={0}
    >
        <Ionicons name={icon} size={isSubItem ? 20 : 24} color={color || "#334155"} />
        <Text style={[drawerStyles.label, color && { color: color }, isSubItem && { fontSize: 13 }]}>{label}</Text>
    </TouchableOpacity>
));

const DrawerNavigator = () => {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerStyle: { width: '80%', backgroundColor: 'transparent' },
                swipeEnabled: false, // Disabling swipe to avoid accidental jitters, use button
                drawerType: 'front', // Crucial for overlay performance without layout resizing
                overlayColor: 'rgba(0,0,0,0.7)',
            }}
        >
            <Drawer.Screen name="MainTabs" component={MainTabs} />
            <Drawer.Screen name="Library" component={LibraryScreen} />
            <Drawer.Screen name="CouncilMeşveret" component={CouncilScreen} />
            <Drawer.Screen name="CouncilSohbet" component={CouncilScreen} />
            <Drawer.Screen name="Assignments" component={DutyDashboardScreen} />
            <Drawer.Screen name="ReadingTracking" component={ReadingTrackingScreen} />
            <Drawer.Screen name="Agenda" component={AgendaScreen} />
            <Drawer.Screen name="About" component={AboutScreen} />
        </Drawer.Navigator>
    );
};

const drawerStyles = StyleSheet.create({
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
    header: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    brandTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.secondary, // Gold
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    brandSubtitle: {
        fontSize: 20,
        fontWeight: '300',
        color: '#fff',
        marginTop: -6,
        letterSpacing: 3,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    userInfo: {
        gap: 4
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 0.5,
    },
    roleBadge: {
        backgroundColor: theme.colors.secondary,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 4
    },
    userRole: {
        fontSize: 11,
        color: '#1e293b',
        fontWeight: 'bold',
    },
    cardContent: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden', // Ensures scrollview content clips
    },
    itemsContainer: {
        paddingHorizontal: 16,
        paddingTop: 12
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
    },
    subItem: {
        paddingVertical: 10,
        paddingLeft: 24,
        backgroundColor: '#F1F5F9', // Slate-100: More distinct than slate-50
        borderLeftWidth: 3,
        borderLeftColor: '#CBD5E1', // Slate-300: Subtle accent bar
        marginVertical: 1, // Tiny separation
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
        marginLeft: 16,
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    accordionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
        marginLeft: 16,
    },
    accordionBody: {
        marginLeft: 12,
        borderLeftWidth: 2,
        borderLeftColor: '#e2e8f0',
        paddingLeft: 8,
        marginBottom: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 16,
        marginHorizontal: 8,
    },
    footer: {
        padding: 24,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        backgroundColor: '#fff'
    },
    version: {
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 12,
    }
});

export const AppNavigator = () => {
    const { user } = useAuthStore();
    const isAuthenticated = !!user;
    const navigationRef = useNavigationContainerRef<any>();

    // Deep Linking Listener
    React.useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const screen = response.notification.request.content.data.screen;
            // Navigate if screen info available and generic type 'any' allows simple string nav
            if (screen && navigationRef.isReady()) {
                navigationRef.navigate(screen);
            }
        });
        return () => subscription.remove();
    }, []);

    // Daily Notification Setup
    React.useEffect(() => {
        if (isAuthenticated && user?.name) {
            const setupNotifications = async () => {
                const hasPermission = await notificationService.registerForPushNotificationsAsync();
                if (hasPermission) {
                    await notificationService.scheduleDailyReminder(user.name);
                }
            };
            setupNotifications();
        }
    }, [isAuthenticated, user?.name]);

    return (
        <AudioProvider>
            <NavigationContainer ref={navigationRef}>
                <View style={{ flex: 1 }}>
                    <Stack.Navigator screenOptions={{ headerShown: false }}>
                        {isAuthenticated ? (
                            <>
                                <Stack.Screen name="DrawerRoot" component={DrawerNavigator} />
                                <Stack.Screen
                                    name="JuzTracking"
                                    component={JuzTrackingScreen}
                                    options={{ title: 'Cüz Takibi', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="AddReadingLog"
                                    component={AddReadingLogScreen}
                                    options={{ title: 'Okuma Ekle', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="Announcements"
                                    component={AnnouncementsScreen}
                                    options={{ title: 'Duyurular', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="Decisions"
                                    component={DecisionsScreen}
                                    options={{ title: 'Meşveret Kararları', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="Contacts"
                                    component={ContactsScreen}
                                    options={{ title: 'Heyetler', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="Accounting"
                                    component={AccountingScreen}
                                    options={{ title: 'Muhasebe', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="AddTransaction"
                                    component={AddTransactionScreen}
                                    options={{ title: 'İşlem Ekle', headerShown: true }}
                                />
                                <Stack.Screen
                                    name="Agenda"
                                    component={AgendaScreen}
                                    options={{ title: 'Ajanda', headerShown: false }}
                                />

                                {/* VP Reader Screens */}
                                <Stack.Screen
                                    name="RisaleVirtualPageSectionList"
                                    component={RisaleVirtualPageSectionList}
                                    options={{ title: 'Bölümler (VP)', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="RisaleVirtualPageReader"
                                    component={RisaleVirtualPageReaderScreen}
                                    options={{ title: 'Okuma (VP)', headerShown: false }}
                                />

                                {/* Library Screens */}
                                {/* QuranReader removed */}
                                <Stack.Screen
                                    name="QuranSurahList"
                                    component={QuranSurahListScreen}
                                    options={{ title: 'Sureler', headerShown: false }}
                                />

                                {/* Risale Screens: Legacy routes removed. Entry via Library -> WorkDetail -> VP Reader */}
                                {/* DELETED: RisaleHome */}

                                {/* DELETED: Legacy PDF Reader */}
                                {/* DELETED: Legacy FlashList Reader */}

                                <Stack.Screen
                                    name="Cevsen"
                                    component={CevsenScreen}
                                    options={{ title: 'Cevşen', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="CevsenLanding"
                                    component={CevsenLandingScreen}
                                    options={{ title: 'Cevşen', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="Lugat"
                                    component={DictionaryScreen}
                                    options={{ title: 'Lügat', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="TesbihatLanding"
                                    component={TesbihatLandingScreen}
                                    options={{ title: 'Tesbihatlar', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="TesbihatPlayer"
                                    component={TesbihatPlayerScreen}
                                    options={{ title: 'Tesbihat Çalar', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="DualarLanding"
                                    component={DualarLandingScreen}
                                    options={{ title: 'Dualar', headerShown: false }}
                                />

                                {/* Risale Library V1 */}
                                <Stack.Screen name="LibraryDetail" component={LibraryDetailScreen} options={{ headerShown: false }} />
                                <Stack.Screen name="WorkDetail" component={WorkDetailScreen} options={{ headerShown: false }} />
                                <Stack.Screen
                                    name="HatimDuasi"
                                    component={HatimDuasiScreen}
                                    options={{ headerShown: false }}
                                />

                                <Stack.Screen
                                    name="RisaleSearch"
                                    component={RisaleSearchScreen}
                                    options={{ title: 'Arama', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="RisaleMyNotes"
                                    component={RisaleMyNotesScreen}
                                    options={{ title: 'Notlarım', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="ReadingHistory"
                                    component={ReadingHistoryScreen}
                                    options={{ title: 'Okuma Geçmişi', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="Notifications"
                                    component={NotificationsScreen}
                                    options={{ title: 'Bildirimler', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="DutyDashboard"
                                    component={DutyDashboardScreen}
                                    options={{ title: 'Nöbet & Görevler', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="DutyList"
                                    component={DutyListScreen}
                                    options={{ title: 'Nöbet Listeleri', headerShown: false }}
                                />
                                <Stack.Screen
                                    name="DutyPoolDetail"
                                    component={DutyPoolDetailScreen}
                                    options={{ title: 'Liste Düzenle', headerShown: false }}
                                />
                            </>
                        ) : (
                            <Stack.Screen
                                name="Login"
                                component={LoginScreen}
                                options={{ headerShown: false }}
                            />
                        )}
                    </Stack.Navigator>
                    <MiniPlayer />
                </View>
            </NavigationContainer>
        </AudioProvider>
    );
};
