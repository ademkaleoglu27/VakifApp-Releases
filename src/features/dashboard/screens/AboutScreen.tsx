import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image, LayoutAnimation, Platform, UIManager } from 'react-native';
import { PremiumHeader } from '@/components/PremiumHeader';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabType = 'GENERAL' | 'GUIDE' | 'ROLES' | 'CREDITS';

export const AboutScreen = (props: any) => {
    const [activeTab, setActiveTab] = useState<TabType>('GENERAL');

    const renderTabButton = (id: TabType, label: string, icon: keyof typeof Ionicons.glyphMap) => (
        <TouchableOpacity
            style={[styles.tabBtn, activeTab === id && styles.tabBtnActive]}
            onPress={() => setActiveTab(id)}
        >
            <Ionicons name={icon} size={18} color={activeTab === id ? '#fff' : '#64748B'} />
            <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    const renderGeneral = () => (
        <ScrollView contentContainerStyle={styles.contentScroll}>
            <View style={styles.card}>
                <View style={styles.logoContainer}>
                    <Text style={styles.logoTitle}>Nur Mektebi</Text>
                    <Text style={styles.logoSubtitle}>Dijital Hizmet Platformu</Text>
                </View>

                <Text style={styles.paragraph}>
                    Nur Mektebi, Risale-i Nur hizmetlerini dijital dünyada daha organize, verimli ve erişilebilir kılmak amacıyla geliştirilmiş kapsamlı bir vakıf yönetim ve takip uygulamasıdır.
                </Text>

                <Text style={styles.paragraph}>
                    Uygulamamız; şahsi okumaların takibinden meşveret kararlarına, nöbet listelerinden lügatçeye kadar bir vakıf ehlinin ihtiyaç duyabileceği tüm araçları tek bir çatı altında toplar.
                </Text>

                <View style={[styles.infoBox, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                    <Ionicons name="heart" size={24} color="#0284C7" />
                    <Text style={[styles.infoText, { color: '#0369A1' }]}>
                        Bu uygulama tamamen <Text style={{ fontWeight: 'bold' }}>Allah rızası</Text> için hazırlanmış olup, hiçbir ticari amaç gütmemektedir. Reklam içermez ve ücretsizdir.
                    </Text>
                </View>

                <TouchableOpacity
                    onLongPress={() => {
                        // @ts-ignore
                        props.navigation?.navigate('RisaleSectionList', { workId: 'sozler', workTitle: 'Sözler (Native Test)' }) || console.log("No nav");
                    }}
                    delayLongPress={1000}
                >
                    <Text style={styles.versionText}>Sürüm: v2.0 Premium (Dev)</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderGuide = () => (
        <ScrollView contentContainerStyle={styles.contentScroll}>
            <GuideItem
                title="Kütüphane & Okuma"
                icon="library"
                color="#0EA5E9"
                description="Risale-i Nur Külliyatı, Kur'an-ı Kerim, Cevşen ve Tesbihatlara buradan ulaşabilirsiniz. Kitap okurken kelimenin üzerine basılı tutarak lügat manasını görebilirsiniz."
            />
            <GuideItem
                title="Okuma Takibi"
                icon="stats-chart"
                color="#8B5CF6"
                description="Günlük okumalarınızı 'Günlük Okuma' sekmesinden ekleyin. 'Okuma Takibi' ekranında haftalık, aylık ve yıllık performansınızı grafiklerle inceleyin. Pazartesi günleri haftalık sıralama yenilenir."
            />
            <GuideItem
                title="Meşveret & Kararlar"
                icon="people"
                color="#F59E0B"
                description="Heyet içi iletişim için kullanılır. Alınan kararlar, yapılan görevlendirmeler ve hizmet nöbetleri bu bölümde yayınlanır. Sadece yetkili kullanıcılar görebilir."
            />
            <GuideItem
                title="Lügat & Araçlar"
                icon="search"
                color="#10B981"
                description="57.000 kelimelik Osmanlıca lügat ile bilinmeyen kelime kalmasın. Ayrıca Ajanda özelliği ile hizmet programlarınızı planlayabilirsiniz."
            />
        </ScrollView>
    );

    const renderRoles = () => (
        <ScrollView contentContainerStyle={styles.contentScroll}>
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Yetki Matrisi</Text>
                <Text style={styles.paragraph}>
                    Uygulama içerisindeki özellikler, kullanıcının hizmetteki konumuna göre açılır.
                </Text>

                <RoleItem
                    role="MİSAFİR"
                    desc="Sadece Risale okuma, Lügat ve Cevşen gibi temel özelliklere erişebilir. Meşveret verilerini göremez."
                />
                <RoleItem
                    role="SOHBET EHLİ"
                    desc="Misafir özelliklerine ek olarak; Duyuruları görebilir ve Cüz Takibi sistemine katılabilir."
                />
                <RoleItem
                    role="VAKIF / HEYET"
                    desc="Tüm özelliklere erişebilir. Kararları okuyabilir, nöbet listelerini görebilir ve Ajanda'yı kullanabilir."
                />
                <RoleItem
                    role="YÖNETİCİ"
                    desc="Sistemin tam yetkili kullanıcısıdır. Karar ekleyebilir, görev atayabilir ve muhasebe kayıtlarını yönetebilir."
                />
            </View>
        </ScrollView>
    );

    const renderCredits = () => (
        <ScrollView contentContainerStyle={styles.contentScroll}>
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Teşekkür & Kaynaklar</Text>
                <Text style={styles.paragraph}>
                    Uygulamamızın içeriğinde ve geliştirilmesinde aşağıdaki kıymetli kaynaklardan istifade edilmiştir:
                </Text>

                <CreditCard
                    title="Sorularla Risale"
                    desc="Risale-i Nur izahları ve kaynakça desteği için."
                    url="https://sorularlarisale.com/"
                    icon="globe-outline"
                />

                <CreditCard
                    title="İhsan Atasoy"
                    desc="Cevşen ve Tesbihat seslendirmeleri için."
                    url="https://www.youtube.com/channel/UCWr4bBSYyvLPrJNoQ8ltx-A"
                    icon="logo-youtube"
                />

                <View style={styles.divider} />

                <Text style={[styles.paragraph, { fontStyle: 'italic', textAlign: 'center', marginTop: 16 }]}>
                    "Senin iktidarın kısa, bekan az, hayatın mahdut, ömrün muvakkat, lazım olan işler çok, ebede namzet olduğun halde..."
                </Text>
                <Text style={{ textAlign: 'center', color: theme.colors.primary, fontWeight: 'bold' }}>- Sözler</Text>
            </View>
        </ScrollView>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader title="Rehber & Hakkında" backButton={true} />

            <View style={styles.tabsContainer}>
                {renderTabButton('GENERAL', 'Genel', 'information-circle')}
                {renderTabButton('GUIDE', 'Rehber', 'book')}
                {renderTabButton('ROLES', 'Yetkiler', 'shield-checkmark')}
                {renderTabButton('CREDITS', 'Kaynaklar', 'link')}
            </View>

            <View style={styles.contentContainer}>
                {activeTab === 'GENERAL' && renderGeneral()}
                {activeTab === 'GUIDE' && renderGuide()}
                {activeTab === 'ROLES' && renderRoles()}
                {activeTab === 'CREDITS' && renderCredits()}
            </View>
        </View>
    );
};

// Sub-components
const GuideItem = ({ title, icon, description, color }: any) => (
    <View style={styles.guideCard}>
        <View style={[styles.guideIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.guideTitle}>{title}</Text>
            <Text style={styles.guideDesc}>{description}</Text>
        </View>
    </View>
);

const RoleItem = ({ role, desc }: any) => (
    <View style={styles.roleItem}>
        <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{role}</Text>
        </View>
        <Text style={styles.roleDesc}>{desc}</Text>
    </View>
);

const CreditCard = ({ title, desc, url, icon }: any) => (
    <TouchableOpacity style={styles.creditCard} onPress={() => Linking.openURL(url)}>
        <View style={styles.creditIcon}>
            <Ionicons name={icon} size={28} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.creditTitle}>{title}</Text>
            <Text style={styles.creditDesc}>{desc}</Text>
            <Text style={styles.linkText}>Siteye Git→</Text>
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#fff',
        gap: 8
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        gap: 4
    },
    tabBtnActive: {
        backgroundColor: theme.colors.primary,
    },
    tabText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B'
    },
    tabTextActive: {
        color: '#fff'
    },
    contentContainer: {
        flex: 1,
    },
    contentScroll: {
        padding: 16,
        paddingBottom: 40
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24
    },
    logoTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif'
    },
    logoSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
        letterSpacing: 1
    },
    paragraph: {
        fontSize: 15,
        color: '#334155',
        lineHeight: 24,
        marginBottom: 16
    },
    infoBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
        alignItems: 'center',
        marginTop: 8
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 16
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 32
    },

    // Guide Styles
    guideCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        gap: 16,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1
    },
    guideIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center'
    },
    guideTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 4
    },
    guideDesc: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18
    },

    // Role Styles
    roleItem: {
        marginBottom: 20,
        borderLeftWidth: 3,
        borderLeftColor: '#E2E8F0',
        paddingLeft: 12
    },
    roleBadge: {
        backgroundColor: '#F1F5F9',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 6
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#475569'
    },
    roleDesc: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20
    },

    // Credit Styles
    creditCard: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        marginBottom: 12,
        gap: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    creditIcon: {
        marginTop: 4
    },
    creditTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B'
    },
    creditDesc: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2
    },
    linkText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: 'bold',
        marginTop: 8
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 20
    }
});
