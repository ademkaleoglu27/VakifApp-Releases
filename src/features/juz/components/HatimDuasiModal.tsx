import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    Platform,
    Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { theme } from '@/config/theme';

interface HatimDuasiModalProps {
    visible: boolean;
    onClose: () => void;
    hatimTitle?: string;
}

const HATIM_DUASI_ARABIC = `اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ.

اَللّٰهُمَّ رَبَّنَا يَا رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ، وَتُبْ عَلَيْنَا يَا مَوْلَانَا إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ.

اَللّٰهُمَّ ارْزُقْنَا بِكُلِّ حَرْفٍ مِنَ الْقُرْآنِ حَلَاوَةً، وَبِكُلِّ كَلِمَةٍ كَرَامَةً، وَبِكُلِّ آيَةٍ سَعَادَةً، وَبِكُلِّ سُورَةٍ سَلَامَةً، وَبِكُلِّ جُزْءٍ جَزَاءً.

اَللّٰهُمَّ اجْعَلِ الْقُرْآنَ لَنَا فِي الدُّنْيَا قَرِينًا، وَفِي الْقَبْرِ مُؤْنِسًا، وَفِي الْقِيَامَةِ شَفِيعًا، وَعَلَى الصِّرَاطِ نُورًا، وَإِلَى الْجَنَّةِ رَفِيقًا، وَمِنَ النَّارِ سِتْرًا وَحِجَابًا.

سُبْحَانَ رَبِّكَ رَبِّ الْعِزَّةِ عَمَّا يَصِفُونَ، وَسَلَامٌ عَلَى الْمُرْسَلِينَ، وَالْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ. الفاتحة`;

const HATIM_DUASI_TRANSLITERATION = `Elhamdü lillâhi rabbil 'âlemîn. Ves-salâtü ves-selâmü 'alâ rasûlinâ Muhammedin ve 'alâ âlihî ve sahbihî ecme'în.

Allâhümme rabbenâ yâ rabbenâ tekabbel minnâ inneke entes-semî'ul 'alîm. Ve tüb 'aleynâ yâ mevlânâ inneke entet-tevvâbür-rahîm.

Allâhümmerzuknâ bi-külli harfin minel-Kur'âni halâveten, ve bi-külli kelimetin kerâmeten, ve bi-külli âyetin se'âdeten, ve bi-külli sûratin selâmeten, ve bi-külli cüz'in cezâ'â.

Allâhümmec'alil-Kur'âne lenâ fid-dünyâ karînâ, ve fil-kabri mûnisâ, ve fil-kıyâmeti şefî'â, ve 'alas-sırâti nûrâ, ve ilel-cenneti refîkâ, ve minen-nâri sitran ve hicâbâ.

Sübhâne rabbike rabbil 'izzeti 'ammâ yasifûn, ve selâmün 'alel mürselîn, vel-hamdü lillâhi rabbil 'âlemîn. El-Fâtiha.`;

const HATIM_DUASI_TURKISH = `Âlemlerin Rabbi olan Allah'a hamd olsun. Salât ve selâm, Peygamberimiz Hz. Muhammed (s.a.v.)'e, onun âline ve bütün ashabına olsun.

Ey Rabbimiz! Okuduğumuz Kur'ân-ı Kerîm'i ve hatm-i şerifi dergâh-ı izzetinde kabul eyle. Şüphesiz Sen her şeyi hakkıyla işiten ve bilensin. Tevbelerimizi kabul eyle; şüphesiz Sen tevbeleri çokça kabul eden ve merhameti sonsuz olansın.

Allah'ım! Kur'an'ın her bir harfi hürmetine bizlere bir tatlılık, her bir kelimesi hürmetine bir ikram, her bir ayeti hürmetine bir saadet, her bir suresi hürmetine bir selamet ve her bir cüzü hürmetine mükâfat ihsan eyle.

Allah'ım! Kur'an-ı Kerim'i dünyada bize yoldaş, kabirde can dostu, kıyamet gününde şefaatçi, sırat köprüsünde nur, cennete ulaştıran bir refik ve cehennem ateşine karşı bir siper eyle.

İzzet ve kudret sahibi Rabbin, onların isnat ettikleri noksan sıfatlardan münezzehtir. Bütün peygamberlere selâm olsun. Âlemlerin Rabbi olan Allah'a hamd olsun. (El-Fâtiha)`;

export const HatimDuasiModal: React.FC<HatimDuasiModalProps> = ({
    visible,
    onClose,
    hatimTitle = 'Genel Hatim'
}) => {
    const handleCopy = async () => {
        const fullText = `🤲 KUR'AN-I KERİM HATİM DUASI (${hatimTitle})\n\n${HATIM_DUASI_TURKISH}\n\n${HATIM_DUASI_ARABIC}`;
        await Clipboard.setStringAsync(fullText);
        alert('Hatim Duası panoya kopyalandı.');
    };

    const handleShare = async () => {
        try {
            await Share.share({
                title: `Kur'an Hatim Duası - ${hatimTitle}`,
                message: `🤲 KUR'AN-I KERİM HATİM DUASI (${hatimTitle})\n\n${HATIM_DUASI_TURKISH}\n\nÂmin. (El-Fâtiha)`
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
            <View style={styles.container}>
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
                        <Text style={styles.headerBadge}>HATİM TAMAMLANDI</Text>
                        <Text style={styles.headerTitle}>Hatim Duası</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={handleShare}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="share-social-outline" size={22} color="#ffffff" />
                    </TouchableOpacity>
                </View>

                {/* Body */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Celebration Banner */}
                    <View style={styles.bannerCard}>
                        <Ionicons name="sparkles" size={28} color="#F59E0B" />
                        <View style={styles.bannerTextContainer}>
                            <Text style={styles.bannerTitle}>Elhamdülillah! Hatim Tamamlandı</Text>
                            <Text style={styles.bannerSubtitle}>
                                "{hatimTitle}" için okunan 30 cüzün duası aşağıdadır.
                            </Text>
                        </View>
                    </View>

                    {/* Arabic Box */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="book" size={18} color={theme.colors.primary} />
                            <Text style={styles.sectionTitle}>Arapça Hatim Duası</Text>
                        </View>
                        <Text style={styles.arabicText}>{HATIM_DUASI_ARABIC}</Text>
                    </View>

                    {/* Turkish Meaning Box */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="heart" size={18} color="#B91C1C" />
                            <Text style={styles.sectionTitle}>Türkçe Meali ve Duası</Text>
                        </View>
                        <Text style={styles.turkishText}>{HATIM_DUASI_TURKISH}</Text>
                    </View>

                    {/* Transliteration Box */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="text-outline" size={18} color="#0369A1" />
                            <Text style={styles.sectionTitle}>Okunuşu (Transkripsiyon)</Text>
                        </View>
                        <Text style={styles.transliterationText}>{HATIM_DUASI_TRANSLITERATION}</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.actionBtnSecondary}
                            onPress={handleCopy}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.actionBtnSecondaryText}>Kopyala</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionBtnPrimary}
                            onPress={handleShare}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="share-social" size={18} color="#ffffff" />
                            <Text style={styles.actionBtnPrimaryText}>Vakıfla Paylaş</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
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
        paddingTop: Platform.OS === 'android' ? 16 : 48,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleBox: {
        alignItems: 'center',
    },
    headerBadge: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FBBF24',
        letterSpacing: 1.2,
    },
    headerTitle: {
        fontSize: 18,
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
        paddingBottom: 40,
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
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#92400E',
    },
    bannerSubtitle: {
        fontSize: 12,
        color: '#B45309',
        marginTop: 2,
    },
    sectionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    arabicText: {
        fontSize: 22,
        color: '#064E3B',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
        lineHeight: 40,
        textAlign: 'right',
    },
    turkishText: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 24,
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
    },
    actionBtnSecondary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
    },
    actionBtnSecondaryText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    actionBtnPrimary: {
        flex: 1.4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
    },
    actionBtnPrimaryText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },
});
