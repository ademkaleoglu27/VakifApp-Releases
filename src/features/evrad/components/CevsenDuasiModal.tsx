import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    Platform,
    Share,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { theme } from '@/config/theme';

interface CevsenDuasiModalProps {
    visible: boolean;
    onClose: () => void;
    currentBabRange?: string;
}

const CEVSEN_DUASI_ARABIC = `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ

سُبْحَانَكَ يَا لَا إِلٰهَ إِلَّا أَنْتَ الْأَمَانَ الْأَمَانَ خَلِّصْنَا مِنَ النَّارِ.

سُبْحَانَكَ يَا لَا إِلٰهَ إِلَّا أَنْتَ الْأَمَانَ الْأَمَانَ نَجِّنَا مِنَ النَّارِ.

سُبْحَانَكَ يَا لَا إِلٰهَ إِلَّا أَنْتَ الْأَمَانَ الْأَمَانَ أَجِرْنَا مِنَ النَّارِ، وَأَدْخِلْنَا الْجَنَّةَ مَعَ الْأَبْرَارِ.

اَللّٰهُمَّ بِحَقِّ هٰذِهِ الْأَسْمَاءِ الشَّرِيفَةِ الْمُبَارَكَةِ، نَجِّنَا وَوَالِدَيْنَا وَإِخْوَانَنَا مِنْ عَذَابِ الْقَبْرِ وَمِنْ عَذَابِ النَّارِ، وَارْزُقْنَا رِضَاكَ وَالْجَنَّةَ، يَا رَبَّ الْعَالَمِينَ. آمين.`;

const CEVSEN_DUASI_TURKISH = `Rahman ve Rahim olan Allah'ın adıyla.

Sübhânsın yâ Rab! Senden başka hiçbir ilah yoktur. Emân ver bize, emân ver! Bizi cehennem ateşinden halâs eyle (kurtar)!

Sübhânsın yâ Rab! Senden başka hiçbir ilah yoktur. Emân ver bize, emân ver! Bizi cehennem ateşinden necât eyle (kurtar)!

Sübhânsın yâ Rab! Senden başka hiçbir ilah yoktur. Emân ver bize, emân ver! Bizi cehennem ateşinden muhâfaza eyle ve bizi ebrâr (hayırlı kulların) ile birlikte Cennetine idhâl eyle (dahil et)!

Allah'ım! Bu mübârek ve şerefli isimlerin hürmetine; bizi, anne-babamızı ve bütün kardeşlerimizi kabir azabından ve cehennem ateşinden muhafaza buyur. Bizlere rızânı ve Cennetini ihsan eyle, ey Âlemlerin Rabbi! Âmin.`;

const CEVSEN_DUASI_TRANSLITERATION = `Bismillâhirrahmânirrahîm.

Sübhâneke yâ lâ ilâhe illâ entel-emânel-emâne hallisnâ minen-nâr.

Sübhâneke yâ lâ ilâhe illâ entel-emânel-emâne neccinâ minen-nâr.

Sübhâneke yâ lâ ilâhe illâ entel-emânel-emâne ecirnâ minen-nâri ve edhilnel-cennete me'al-ebrâr.

Allâhümme bi-hakkı hâzihil-esmâ'iş-şerîfetil-mübâraketi, neccinâ ve vâlideynâ ve ihvânenâ min 'azâbil-kabri ve min 'azâbin-nâr, verzuknâ rıdâke vel-cenneh, yâ Rabbel-'âlemîn. Âmîn.`;

export const CevsenDuasiModal: React.FC<CevsenDuasiModalProps> = ({
    visible,
    onClose,
    currentBabRange = "100 Bab"
}) => {
    const handleCopy = async () => {
        const text = `🤲 CEVŞEN-ÜL KEBİR DUASI (${currentBabRange})\n\n${CEVSEN_DUASI_TURKISH}\n\n${CEVSEN_DUASI_ARABIC}`;
        await Clipboard.setStringAsync(text);
        alert('Cevşen Duası panoya kopyalandı.');
    };

    const handleShare = async () => {
        try {
            await Share.share({
                title: `Cevşen Duası - ${currentBabRange}`,
                message: `🤲 CEVŞEN-ÜL KEBİR DUASI\n\n${CEVSEN_DUASI_TURKISH}\n\nÂmin.`
            });
        } catch (e) {
            console.warn(e);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
                
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleBox}>
                        <Text style={styles.headerBadge}>CEVŞENÜ'L-KEBİR</Text>
                        <Text style={styles.headerTitle} numberOfLines={1}>Cevşen Duası & Münâcaat</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={handleShare}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="share-social-outline" size={22} color="#ffffff" />
                    </TouchableOpacity>
                </View>

                {/* Body with full scroll */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                >
                    {/* Celebration Banner */}
                    <View style={styles.bannerCard}>
                        <Ionicons name="sparkles" size={26} color="#F59E0B" />
                        <View style={styles.bannerTextBox}>
                            <Text style={styles.bannerTitle}>Elhamdülillah! Okumanız Tamamlandı</Text>
                            <Text style={styles.bannerSubtitle}>
                                "{currentBabRange}" okuma hasılatının ve münâcaatının duası aşağıdadır.
                            </Text>
                        </View>
                    </View>

                    {/* Arabic Text Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="book" size={18} color={theme.colors.primary} />
                            <Text style={styles.cardTitle}>Arapça Münâcaat</Text>
                        </View>
                        <Text style={styles.arabicText}>{CEVSEN_DUASI_ARABIC}</Text>
                    </View>

                    {/* Turkish Meaning Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="heart" size={18} color="#B91C1C" />
                            <Text style={styles.cardTitle}>Türkçe Meali & Duası</Text>
                        </View>
                        <Text style={styles.turkishText}>{CEVSEN_DUASI_TURKISH}</Text>
                    </View>

                    {/* Transliteration Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="text-outline" size={18} color="#0369A1" />
                            <Text style={styles.cardTitle}>Türkçe Okunuşu</Text>
                        </View>
                        <Text style={styles.transliterationText}>{CEVSEN_DUASI_TRANSLITERATION}</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.btnSecondary}
                            onPress={handleCopy}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.btnSecondaryText}>Kopyala</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.btnPrimary}
                            onPress={handleShare}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="share-social" size={18} color="#ffffff" />
                            <Text style={styles.btnPrimaryText}>Paylaş</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAF9',
    },
    header: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 4,
    },
    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleBox: {
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 8,
    },
    headerBadge: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FBBF24',
        letterSpacing: 1.2,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 80,
    },
    bannerCard: {
        backgroundColor: '#FEF3C7',
        borderRadius: 18,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    bannerTextBox: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#92400E',
    },
    bannerSubtitle: {
        fontSize: 12,
        color: '#B45309',
        marginTop: 2,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    arabicText: {
        fontSize: 20,
        color: '#064E3B',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
        lineHeight: 36,
        textAlign: 'right',
    },
    turkishText: {
        fontSize: 13,
        color: '#334155',
        lineHeight: 22,
        fontWeight: '500',
    },
    transliterationText: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 22,
        fontStyle: 'italic',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
        marginBottom: 30,
    },
    btnSecondary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        borderRadius: 14,
        paddingVertical: 12,
    },
    btnSecondaryText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    btnPrimary: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        borderRadius: 14,
        paddingVertical: 12,
    },
    btnPrimaryText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#ffffff',
    },
});
