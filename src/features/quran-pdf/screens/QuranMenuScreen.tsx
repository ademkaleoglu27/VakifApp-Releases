import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Modal, FlatList, TextInput, Alert, Dimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/config/theme';
import METADATA from '../data/quran_metadata.json'; // Importing the JSON we created

const STORAGE_KEY = '@quran_last_page';
const { width } = Dimensions.get('window');

export const QuranMenuScreen = () => {
    const navigation = useNavigation<any>();
    const [lastPage, setLastPage] = useState<number | null>(null);
    const [modalVisible, setModalVisible] = useState<'none' | 'surah' | 'juz'>('none');
    const [pageInput, setPageInput] = useState('');
    const [showPageInput, setShowPageInput] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            loadLastPage();
        }, [])
    );

    const loadLastPage = async () => {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setLastPage(parseInt(saved, 10));
    };

    const navigateToReader = (page: number) => {
        setModalVisible('none');
        setShowPageInput(false);
        navigation.navigate('QuranReaderScreen', { page });
    };

    // --- Sub-Components ---
    const MenuButton = ({ title, icon, subtitle, onPress, primary = false }: any) => (
        <TouchableOpacity
            style={[styles.menuBtn, primary && styles.menuBtnPrimary]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={[styles.iconBox, primary ? styles.iconBoxPrimary : styles.iconBoxSecondary]}>
                <Ionicons name={icon} size={28} color={primary ? '#FFF' : theme.colors.primary} />
            </View>
            <View style={styles.btnTextContainer}>
                <Text style={[styles.btnTitle, primary && styles.textWhite]}>{title}</Text>
                {subtitle && <Text style={[styles.btnSubtitle, primary && styles.textWhiteOpac]}>{subtitle}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={24} color={primary ? '#FFF' : '#CBD5E1'} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('LibraryHome')} style={styles.backButton}>
                    <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Kur'an-ı Kerim</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Resume Section */}
                <View style={styles.section}>
                    <MenuButton
                        title="Kaldığım Yerden Devam Et"
                        subtitle={lastPage ? `Son okunan: Sayfa ${lastPage}` : "Henüz okuma yapılmadı"}
                        icon="bookmark"
                        primary={true}
                        onPress={() => navigateToReader(lastPage || 1)}
                    />
                </View>

                {/* Grid Navigation */}
                <View style={styles.grid}>
                    <TouchableOpacity style={styles.gridItem} onPress={() => setModalVisible('surah')}>
                        <Ionicons name="list" size={32} color={theme.colors.primary} />
                        <Text style={styles.gridLabel}>Sureler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.gridItem} onPress={() => setModalVisible('juz')}>
                        <Ionicons name="apps" size={32} color={theme.colors.primary} />
                        <Text style={styles.gridLabel}>Cüzler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.gridItem} onPress={() => setShowPageInput(true)}>
                        <Ionicons name="return-up-forward" size={32} color={theme.colors.primary} />
                        <Text style={styles.gridLabel}>Sayfaya Git</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Surah Modal */}
            <Modal visible={modalVisible === 'surah'} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Sure Seçimi</Text>
                    <TouchableOpacity onPress={() => setModalVisible('none')}>
                        <Text style={styles.closeText}>Kapat</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={METADATA.surahs}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.listItem} onPress={() => navigateToReader(item.page)}>
                            <View style={styles.listNum}><Text style={styles.listNumText}>{item.id}</Text></View>
                            <Text style={styles.listName}>{item.name}</Text>
                            <Text style={styles.listPage}>Sayfa {item.page}</Text>
                        </TouchableOpacity>
                    )}
                />
            </Modal>

            {/* Juz Modal */}
            <Modal visible={modalVisible === 'juz'} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Cüz Seçimi</Text>
                    <TouchableOpacity onPress={() => setModalVisible('none')}>
                        <Text style={styles.closeText}>Kapat</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={METADATA.juzs}
                    numColumns={3}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 10 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.juzItem} onPress={() => navigateToReader(item.page)}>
                            <Text style={styles.juzNum}>{item.id}. Cüz</Text>
                            <Text style={styles.juzPage}>Sayfa {item.page}</Text>
                        </TouchableOpacity>
                    )}
                />
            </Modal>

            {/* Page Jump Modal (Simple Overlay) */}
            <Modal visible={showPageInput} transparent animationType="fade">
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPageInput(false)}>
                    <View style={styles.dialog}>
                        <Text style={styles.dialogTitle}>Sayfaya Git</Text>
                        <TextInput
                            style={styles.pageInput}
                            placeholder="1"
                            placeholderTextColor="#94a3b8"
                            keyboardType="number-pad"
                            maxLength={3}
                            value={pageInput}
                            onChangeText={setPageInput}
                            autoComplete="off"
                            importantForAutofill="no"
                            textContentType="none"
                        />
                        <TouchableOpacity
                            style={styles.goBtn}
                            onPress={() => {
                                const p = parseInt(pageInput);
                                if (p >= 1 && p <= 604) navigateToReader(p);
                                else Alert.alert("Hata", "Geçersiz sayfa numarası");
                            }}
                        >
                            <Text style={styles.goBtnText}>GİT</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', padding: 20, alignItems: 'center' },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
    scrollContent: { padding: 20 },
    section: { marginBottom: 32 },
    menuBtn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 12
    },
    menuBtnPrimary: { backgroundColor: theme.colors.primary },
    iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    iconBoxPrimary: { backgroundColor: 'rgba(255,255,255,0.2)' },
    iconBoxSecondary: { backgroundColor: '#F1F5F9' },
    btnTextContainer: { flex: 1 },
    btnTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    btnSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
    textWhite: { color: '#FFF' },
    textWhiteOpac: { color: 'rgba(255,255,255,0.8)' },

    grid: { flexDirection: 'row', justifyContent: 'space-between' },
    gridItem: {
        width: (width - 60) / 3, height: 100, backgroundColor: '#FFF', borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
    },
    gridLabel: { marginTop: 8, fontWeight: '600', color: '#334155' },

    // Modals
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#EEE' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    closeText: { color: theme.colors.primary, fontSize: 16 },
    listItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' },
    listNum: { width: 30, height: 30, backgroundColor: '#F1F5F9', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    listNumText: { fontWeight: 'bold', color: '#64748B' },
    listName: { flex: 1, fontSize: 16, fontWeight: '500' },
    listPage: { fontSize: 14, color: '#94A3B8' },

    juzItem: { width: '30%', margin: '1.5%', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, alignItems: 'center' },
    juzNum: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
    juzPage: { fontSize: 12, color: '#94A3B8', marginTop: 4 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    dialog: { width: 300, backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center' },
    dialogTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, textAlign: 'center', fontSize: 20, marginBottom: 16 },
    goBtn: { width: '100%', backgroundColor: theme.colors.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
    goBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
