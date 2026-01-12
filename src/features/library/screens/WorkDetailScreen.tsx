import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { getWork } from '@/data/libraryRegistry';
import { LinearGradient } from 'expo-linear-gradient';

export const WorkDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { workId } = route.params;

    const work = getWork(workId);

    if (!work) {
        return (
            <View style={styles.center}>
                <Text>Kitap bulunamadı.</Text>
            </View>
        );
    }

    const handleRead = () => {
        // LOCKED: Use mode='section' standard
        // For 'sozler', first section is 'soz-001' (Standardizing usually). 
        // Ideally we resolve first section from DB or hardcode for V1.
        // For now, assuming user will use TOC or we just open 1. Soz.
        // Let's use 'sozler_1' if widely known, or just open TOC if unsure.
        // Better: Open Section List directly if "Oku" is ambiguous, or open first section.
        // RisaleVirtualPageReader requires specific sectionId.

        // Strategy: Open SectionList (TOC) for now to be safe, 
        // OR open First Section (Birinci Söz).

        // Let's navigate to TOC for "İçindekiler" and maybe hardcode First Section for "Oku"
        navigation.navigate('RisaleVirtualPageSectionList', {
            workId: work.workId,
            workTitle: work.title
        });
    };

    const handleToc = () => {
        navigation.navigate('RisaleVirtualPageSectionList', {
            workId: work.workId,
            workTitle: work.title
        });
    };

    // Special: "Oku" should ideally resume or open first section.
    // Since resume is disabled, we can link to first section if we know logic, or just TOC.
    // Let's make "Oku" open the first section (Birinci Söz) for 'sozler'.
    const handleStartReading = () => {
        if (work.workId === 'sozler') {
            // Hardcoded first section for V1 'sozler' -> 'soz_1' or similar?
            // Checking db_content... 
            // To be safe, let's just go to TOC for V1 to ensure no 404.
            // User can choose section.
            handleToc();
            return;
        }
        handleToc();
    };


    return (
        <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
            <LinearGradient
                colors={['#fff', '#f8fafc']}
                style={styles.content}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="close-circle" size={32} color="#94a3b8" />
                </TouchableOpacity>

                <View style={styles.coverContainer}>
                    <View style={styles.coverPlaceholder}>
                        <Ionicons name="book" size={64} color={theme.colors.primary} />
                    </View>
                </View>

                <Text style={styles.title}>{work.title}</Text>
                <Text style={styles.desc}>{work.description}</Text>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.readBtn} onPress={handleStartReading}>
                        <Ionicons name="book-outline" size={24} color="white" />
                        <Text style={styles.readBtnText}>Kitabı Oku</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.tocBtn} onPress={handleToc}>
                        <Ionicons name="list" size={24} color={theme.colors.primary} />
                        <Text style={styles.tocBtnText}>İçindekiler</Text>
                    </TouchableOpacity>
                </View>

            </LinearGradient>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 60 },
    backBtn: { position: 'absolute', top: 50, left: 24, zIndex: 10 },
    coverContainer: {
        width: 140, height: 200, backgroundColor: '#f1f5f9', borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', marginBottom: 24,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
    },
    coverPlaceholder: { opacity: 0.5 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, textAlign: 'center' },
    desc: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
    actions: { width: '100%', gap: 16 },
    readBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 18, borderRadius: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12,
        elevation: 4
    },
    readBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    tocBtn: {
        backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0',
        paddingVertical: 18, borderRadius: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12
    },
    tocBtnText: { color: theme.colors.primary, fontSize: 18, fontWeight: '600' }
});
