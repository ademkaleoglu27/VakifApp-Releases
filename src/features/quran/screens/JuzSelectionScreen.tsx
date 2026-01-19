import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Dimensions, StatusBar, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { QuranService } from '../services/QuranService';

const { width } = Dimensions.get('window');

interface JuzItem {
    juzNumber: number;
    title: string;
    isDownloaded: boolean;
    downloadedCount: number;
    totalCount: number;
}

export const JuzSelectionScreen = () => {
    const navigation = useNavigation<any>();
    const [juzData, setJuzData] = useState<JuzItem[]>([]);
    const [downloadingJuz, setDownloadingJuz] = useState<number | null>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        loadJuzData();
    }, []);

    const loadJuzData = async () => {
        const data: JuzItem[] = [];
        for (let i = 1; i <= 30; i++) {
            const status = await QuranService.getJuzStatus(i);
            data.push({
                juzNumber: i,
                title: `${i}. Cüz`,
                isDownloaded: status.isFullyDownloaded,
                downloadedCount: status.downloadedCount,
                totalCount: status.totalCount
            });
        }
        setJuzData(data);
    };

    const handleJuzPress = async (juz: JuzItem) => {
        if (juz.isDownloaded) {
            // Open Reader
            const { start } = QuranService.getJuzPageRange(juz.juzNumber);
            navigation.navigate('QuranReaderScreen', { initialPage: start, juzNumber: juz.juzNumber });
        } else {
            // Ask to download
            Alert.alert(
                `${juz.juzNumber}. Cüz İndir`,
                `Bu cüzü okumak için indirmeniz gerekmektedir. (~5MB)`,
                [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'İndir', onPress: () => startDownload(juz.juzNumber) }
                ]
            );
        }
    };

    const startDownload = async (juzNumber: number) => {
        setDownloadingJuz(juzNumber);
        setProgress(0);

        try {
            await QuranService.downloadJuz(juzNumber, (completed, total) => {
                setProgress(completed / total);
            });
            // Refresh status
            await loadJuzData();
            setDownloadingJuz(null);

            // Auto open
            const { start } = QuranService.getJuzPageRange(juzNumber);
            navigation.navigate('QuranReaderScreen', { initialPage: start, juzNumber: juzNumber });
        } catch (e) {
            Alert.alert('Hata', 'İndirme başarısız oldu.');
            setDownloadingJuz(null);
        }
    };

    const renderItem = ({ item }: { item: JuzItem }) => {
        const isDownloading = downloadingJuz === item.juzNumber;

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => !isDownloading && handleJuzPress(item)}
                style={[styles.card, item.isDownloaded && styles.cardDownloaded]}
            >
                <View style={[styles.badgeContainer, item.isDownloaded && styles.badgeDownloaded]}>
                    <Text style={[styles.badgeText, item.isDownloaded && { color: '#FFF' }]}>{item.juzNumber}</Text>
                </View>

                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.title}</Text>

                    {isDownloading ? (
                        <View>
                            <Text style={styles.statusText}>İndiriliyor... %{Math.round(progress * 100)}</Text>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.statusText}>
                            {item.isDownloaded ? 'Okumaya Hazır' : 'İndir & Oku'}
                        </Text>
                    )}
                </View>

                <View style={styles.actionIcon}>
                    {isDownloading ? (
                        <Ionicons name="cloud-download" size={24} color={theme.colors.primary} />
                    ) : item.isDownloaded ? (
                        <Ionicons name="chevron-forward" size={24} color="#10B981" />
                    ) : (
                        <Ionicons name="download-outline" size={24} color="#64748B" />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Kur'an-ı Kerim</Text>
                    <Text style={styles.headerSubtitle}>Cüz Seçimi</Text>
                </View>
            </View>

            <FlatList
                data={juzData}
                renderItem={renderItem}
                keyExtractor={item => item.juzNumber.toString()}
                contentContainerStyle={styles.listContent}
                numColumns={1}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 8
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed'
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2
    },
    listContent: {
        padding: 20
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    cardDownloaded: {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4'
    },
    badgeContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    badgeDownloaded: {
        backgroundColor: '#10B981',
    },
    badgeText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#64748B'
    },
    cardContent: {
        flex: 1
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4
    },
    statusText: {
        fontSize: 13,
        color: '#64748B'
    },
    actionIcon: {
        marginLeft: 12
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        marginTop: 6,
        width: '100%'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 2
    }
});
