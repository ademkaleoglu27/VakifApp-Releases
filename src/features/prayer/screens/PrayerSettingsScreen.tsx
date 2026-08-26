import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    StatusBar,
    Modal,
    TextInput,
    Alert,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { prayerTimesService, TURKEY_CITIES, CityInfo } from '../services/prayerTimesService';
import { prayerNotificationService, PrayerNotificationSettings } from '../services/prayerNotificationService';
import { theme } from '@/config/theme';

export const PrayerSettingsScreen: React.FC = () => {
    const navigation = useNavigation();
    const [settings, setSettings] = useState<PrayerNotificationSettings>(prayerNotificationService.getSettings());
    const [selectedCity, setSelectedCity] = useState<CityInfo>(prayerTimesService.getSelectedCity());
    const [showCityModal, setShowCityModal] = useState(false);
    const [citySearch, setCitySearch] = useState('');
    const [gpsLoading, setGpsLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const s = await prayerNotificationService.loadSettings();
        setSettings(s);
        const c = await prayerTimesService.loadSelectedCity();
        setSelectedCity(c);
    };

    const updateSettings = async (patch: Partial<PrayerNotificationSettings>) => {
        const updated = { ...settings, ...patch };
        setSettings(updated);
        await prayerNotificationService.saveSettings(updated);
    };

    const togglePrayer = (prayerKey: keyof PrayerNotificationSettings['prayers']) => {
        const updatedPrayers = {
            ...settings.prayers,
            [prayerKey]: !settings.prayers[prayerKey],
        };
        updateSettings({ prayers: updatedPrayers });
    };

    const handleSelectCity = async (city: CityInfo) => {
        await prayerTimesService.setSelectedCity(city);
        setSelectedCity(city);
        setShowCityModal(false);
        await prayerNotificationService.rescheduleAll();
        Alert.alert('Konum Güncellendi', `${city.name} için namaz vakitleri ve bildirimler güncellendi.`);
    };

    const handleDetectGps = async () => {
        setGpsLoading(true);
        const detected = await prayerTimesService.detectLocationAndSetCity();
        setGpsLoading(false);
        if (detected) {
            setSelectedCity(detected);
            setShowCityModal(false);
            await prayerNotificationService.rescheduleAll();
            Alert.alert('Konum Tespit Edildi', `${detected.name} için namaz vakitleri hassasiyetle hesaplandı.`);
        } else {
            Alert.alert('Konum Alınamadı', 'Lütfen GPS konum iznini kontrol ediniz.');
        }
    };

    const filteredCities = TURKEY_CITIES.filter(c =>
        c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
        c.id.includes(citySearch)
    );

    const REMINDER_OPTIONS = [15, 30, 45, 60];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Text style={styles.headerTitle}>VAKİT & BİLDİRİM AYARLARI</Text>
                    <Text style={styles.headerSubtitle}>Namaz Hatırlatıcıları</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* 1. Location Selection Card */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>📍 Şehir ve Konum</Text>
                    <TouchableOpacity
                        style={styles.citySelectorRow}
                        onPress={() => setShowCityModal(true)}
                        activeOpacity={0.7}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cityLabel}>Seçili İl / Konum</Text>
                            <Text style={styles.cityName}>{selectedCity.name}</Text>
                        </View>
                        <View style={styles.changeCityBtn}>
                            <Text style={styles.changeCityBtnText}>Değiştir</Text>
                            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* 2. Master Notification Toggle */}
                <View style={styles.sectionCard}>
                    <View style={styles.rowBetween}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.settingTitle}>Namaz Bildirimleri</Text>
                            <Text style={styles.settingDesc}>Vakit girdiğinde ve öncesinde bildirim gönder</Text>
                        </View>
                        <Switch
                            value={settings.enabled}
                            onValueChange={(val) => updateSettings({ enabled: val })}
                            trackColor={{ false: '#E2E8F0', true: theme.colors.accent }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.rowBetween}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.settingTitle}>Bildirim Sesi</Text>
                            <Text style={styles.settingDesc}>Bildirimler sesli uyarı versin</Text>
                        </View>
                        <Switch
                            value={settings.soundEnabled}
                            onValueChange={(val) => updateSettings({ soundEnabled: val })}
                            trackColor={{ false: '#E2E8F0', true: theme.colors.accent }}
                            thumbColor="#FFFFFF"
                            disabled={!settings.enabled}
                        />
                    </View>
                </View>

                {/* 3. Early Warning (Son 45 dk) Settings */}
                <View style={styles.sectionCard}>
                    <View style={styles.rowBetween}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.settingTitle}>⏳ Vakit Çıkmadan Önce Hatırlat</Text>
                            <Text style={styles.settingDesc}>
                                Namazın kazaya kalmaması için vakit çıkışından önce uyar
                            </Text>
                        </View>
                        <Switch
                            value={settings.earlyWarningEnabled}
                            onValueChange={(val) => updateSettings({ earlyWarningEnabled: val })}
                            trackColor={{ false: '#E2E8F0', true: theme.colors.secondary }}
                            thumbColor="#FFFFFF"
                            disabled={!settings.enabled}
                        />
                    </View>

                    {settings.earlyWarningEnabled && (
                        <View style={{ marginTop: 14 }}>
                            <Text style={styles.subSettingLabel}>Kaç dakika önce hatırlatılsın?</Text>
                            <View style={styles.pillGroup}>
                                {REMINDER_OPTIONS.map(mins => (
                                    <TouchableOpacity
                                        key={mins}
                                        style={[
                                            styles.pillBtn,
                                            settings.earlyWarningMinutes === mins && styles.pillBtnActive
                                        ]}
                                        onPress={() => updateSettings({ earlyWarningMinutes: mins })}
                                        disabled={!settings.enabled}
                                    >
                                        <Text style={[
                                            styles.pillBtnText,
                                            settings.earlyWarningMinutes === mins && styles.pillBtnTextActive
                                        ]}>
                                            {mins} dk
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                {/* 4. Per-Prayer Notifications */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>🕌 Vakte Özel Bildirimler</Text>

                    {[
                        { key: 'imsak', label: 'Sabah Namazı' },
                        { key: 'gunes', label: 'Güneş Doğuşu (İşrak)' },
                        { key: 'ogle', label: 'Öğle Namazı' },
                        { key: 'ikindi', label: 'İkindi Namazı' },
                        { key: 'aksam', label: 'Akşam Namazı' },
                        { key: 'yatsi', label: 'Yatsı Namazı' },
                    ].map((p, idx) => (
                        <React.Fragment key={p.key}>
                            {idx > 0 && <View style={styles.divider} />}
                            <View style={styles.rowBetween}>
                                <Text style={styles.prayerRowLabel}>{p.label}</Text>
                                <Switch
                                    value={settings.prayers[p.key as keyof PrayerNotificationSettings['prayers']]}
                                    onValueChange={() => togglePrayer(p.key as keyof PrayerNotificationSettings['prayers'])}
                                    trackColor={{ false: '#E2E8F0', true: theme.colors.primary }}
                                    thumbColor="#FFFFFF"
                                    disabled={!settings.enabled}
                                />
                            </View>
                        </React.Fragment>
                    ))}
                </View>
            </ScrollView>

            {/* City Selection Modal */}
            <Modal
                visible={showCityModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowCityModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowCityModal(false)} style={styles.modalCloseBtn}>
                            <Ionicons name="close" size={24} color="#334155" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>İl / Şehir Seçin</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* GPS Auto Button */}
                    <TouchableOpacity
                        style={styles.gpsDetectBtn}
                        onPress={handleDetectGps}
                        disabled={gpsLoading}
                    >
                        <Ionicons name="navigate" size={18} color="#FFFFFF" />
                        <Text style={styles.gpsDetectBtnText}>
                            {gpsLoading ? 'Konum Alınıyor...' : '📍 GPS Konumumu Otomatik Tespit Et'}
                        </Text>
                    </TouchableOpacity>

                    {/* Search Input */}
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color="#94A3B8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Şehir adı veya plaka ara..."
                            placeholderTextColor="#94A3B8"
                            value={citySearch}
                            onChangeText={setCitySearch}
                        />
                    </View>

                    {/* City List */}
                    <FlatList
                        data={filteredCities}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.cityItem,
                                    selectedCity.id === item.id && styles.cityItemActive
                                ]}
                                onPress={() => handleSelectCity(item)}
                            >
                                <Text style={styles.cityPlate}>{item.id}</Text>
                                <Text style={[
                                    styles.cityNameItem,
                                    selectedCity.id === item.id && styles.cityNameItemActive
                                ]}>
                                    {item.name}
                                </Text>
                                {selectedCity.id === item.id && (
                                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FAF5EA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.colors.primary,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleBox: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#D1FAE5',
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E7E5E4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#78350F',
        marginBottom: 12,
    },
    citySelectorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cityLabel: {
        fontSize: 11,
        color: '#78716C',
    },
    cityName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#1C1917',
        marginTop: 2,
    },
    changeCityBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    changeCityBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    settingTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1C1917',
    },
    settingDesc: {
        fontSize: 11,
        color: '#78716C',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F5F5F4',
        marginVertical: 10,
    },
    subSettingLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#57534E',
        marginBottom: 8,
    },
    pillGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    pillBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#F5F5F4',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E7E5E4',
    },
    pillBtnActive: {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
    },
    pillBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#78716C',
    },
    pillBtnTextActive: {
        color: '#B45309',
    },
    prayerRowLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1C1917',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    gpsDetectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        margin: 16,
        marginBottom: 8,
        paddingVertical: 12,
        borderRadius: 12,
    },
    gpsDetectBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 'bold',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F8FAFC',
        marginHorizontal: 16,
        marginVertical: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#0F172A',
    },
    cityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    cityItemActive: {
        backgroundColor: '#ECFDF5',
    },
    cityPlate: {
        width: 32,
        fontSize: 13,
        fontWeight: 'bold',
        color: '#94A3B8',
    },
    cityNameItem: {
        flex: 1,
        fontSize: 15,
        color: '#334155',
        fontWeight: '500',
    },
    cityNameItemActive: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
});
