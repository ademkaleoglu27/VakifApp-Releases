import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { HTML_CHAPTERS, HtmlChapter } from '@/features/reader/html/htmlManifest'; // Import Manifest

export const RisaleHtmlReaderHomeScreen = () => {
    const navigation = useNavigation<any>();

    const renderItem = ({ item }: { item: HtmlChapter }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('RisaleHtmlReader', { assetPath: item.assetPath, title: item.title })}
        >
            <View style={styles.iconContainer}>
                <Text style={styles.indexText}>{item.id.replace('soz_0', '').replace('soz_', '')}</Text>
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>Sözler • HTML Pilot</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#334155" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>HTML Reader Pilot</Text>
            </View>

            <View style={styles.infoBox}>
                <Ionicons name="flask-outline" size={20} color="#b45309" />
                <Text style={styles.infoText}>
                    Bu modül deneyseldir (V2).{' \n'}
                    • WebView + CSS (Crimson Pro){' \n'}
                    • Pinch-to-Zoom (Aktif){' \n'}
                    • HTML DOM Hit-Testing (Lugat)
                </Text>
            </View>

            <FlatList
                data={HTML_CHAPTERS}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    backButton: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    infoBox: { flexDirection: 'row', margin: 16, padding: 12, backgroundColor: '#fff7ed', borderRadius: 8, borderWidth: 1, borderColor: '#fed7aa', alignItems: 'center' },
    infoText: { marginLeft: 12, color: '#7c2d12', fontSize: 13, lineHeight: 18 },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    iconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    indexText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
    textContainer: { flex: 1 },
    title: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#64748b' },
});
