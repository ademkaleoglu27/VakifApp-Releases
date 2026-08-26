import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDb, reinstallContentDbAsset } from '../services/contentDb';
import * as FileSystem from 'expo-file-system';
import { ContentHealthGate } from '../services/contentHealthGate';
import * as Clipboard from 'expo-clipboard';

export const ContentHealthDebugScreen = () => {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [lastRun, setLastRun] = useState<string>('');

    const runHealthCheck = async () => {
        try {
            setLoading(true);
            const db = getDb();

            // 1. Run Standard Diagnostics
            const diagnostics = await ContentHealthGate.runDiagnostics(db);

            // 2. Run Additional Raw Queries for Verification
            const databaseList = await db.getAllAsync('PRAGMA database_list');

            // Sözler Specific Checks
            const sozlerCount = await db.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM sections WHERE book_id='risale.sozler@diyanet.tr'"
            );

            const sozlerParaCount = await db.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM paragraphs p JOIN sections s ON s.id=p.section_id WHERE s.work_id='sozler'"
            );

            const sozlerNullUid = await db.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM sections WHERE book_id='risale.sozler@diyanet.tr' AND section_uid IS NULL"
            );

            const sozlerDupUid = await db.getAllAsync(
                "SELECT section_uid, COUNT(*) c FROM sections WHERE book_id='risale.sozler@diyanet.tr' GROUP BY section_uid HAVING c>1 LIMIT 10"
            );

            const nullOrEmptyBookId = await db.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM sections WHERE work_id='sozler' AND (book_id IS NULL OR book_id='')"
            );

            const tableInfo = await db.getAllAsync('PRAGMA table_info(sections)');
            const indexList = await db.getAllAsync('PRAGMA index_list(sections)');

            // 3. Inventory Checks (For Mektubat Diagnosis)
            const bookIdInventory = await db.getAllAsync(
                "SELECT DISTINCT book_id FROM sections WHERE book_id LIKE 'risale.%' ORDER BY book_id LIMIT 200"
            );

            const bookIdBreakdown = await db.getAllAsync(
                "SELECT work_id, book_id, COUNT(*) c FROM sections GROUP BY work_id, book_id ORDER BY work_id, c DESC"
            );

            const mektubatCandidates = await db.getAllAsync<{ book_id: string }>(
                "SELECT DISTINCT book_id FROM sections WHERE lower(book_id) LIKE '%mektubat%' LIMIT 50"
            );

            const mektubatWorkCount = await db.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM sections WHERE work_id='mektubat'"
            );

            // Mektubat Specific Checks (Read-Only)
            const MEKTUBAT_BOOK_ID = 'risale.mektubat@diyanet.tr';

            const mektubatByWorkId = await db.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM sections WHERE work_id='mektubat'"
            );

            const mektubatByBookId = await db.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM sections WHERE book_id=?", [MEKTUBAT_BOOK_ID]
            );

            // Check for NULL/Empty entries specifically for Mektubat
            const mektubatNullBookId = await db.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM sections WHERE work_id='mektubat' AND (book_id IS NULL OR book_id='')"
            );

            const mektubatDupUid = await db.getAllAsync(
                "SELECT section_uid, COUNT(*) c FROM sections WHERE work_id='mektubat' GROUP BY section_uid HAVING c>1 LIMIT 10"
            );

            // Lemalar Specific Checks
            const CANONICAL_LEMALAR_ID = 'risale.lemalar@diyanet.tr';

            const lemDoc = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM sections WHERE work_id='lemalar'");
            const lemBook = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM sections WHERE book_id=?", [CANONICAL_LEMALAR_ID]);
            const lemNullUid = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM sections WHERE work_id='lemalar' AND (section_uid IS NULL OR section_uid='')");
            const lemDupUid = await db.getAllAsync("SELECT section_uid, COUNT(*) c FROM sections WHERE work_id='lemalar' GROUP BY section_uid HAVING c>1 LIMIT 10");
            const lemSample = await db.getAllAsync("SELECT id,title,parent_id,type,section_uid,book_id FROM sections WHERE work_id='lemalar' LIMIT 10");
            const lemPara = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM paragraphs p JOIN sections s ON s.id=p.section_id WHERE s.work_id='lemalar'");
            const lemOrphan = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM paragraphs p WHERE p.section_id LIKE 'lemalar%' AND NOT EXISTS (SELECT 1 FROM sections s WHERE s.id=p.section_id)");
            const lemParaSample = await db.getAllAsync("SELECT section_id, COUNT(*) c FROM paragraphs WHERE section_id LIKE 'lemalar%' GROUP BY section_id LIMIT 10");

            // Inventory Check
            const distinctWorks = await db.getAllAsync("SELECT DISTINCT work_id FROM sections ORDER BY work_id");

            const MektubatSample = await db.getAllAsync("SELECT id,title,parent_id,type,section_uid FROM sections WHERE work_id='mektubat' LIMIT 5");

            const totalSections = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM sections");
            const totalParagraphs = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM paragraphs");

            const report = {
                timestamp: new Date().toISOString(),
                database_list: databaseList, // Added for path verification
                health: {
                    sozler_sections: sozlerCount?.c,
                    sozler_paragraphs: sozlerParaCount?.c,
                    sozler_null_uid: sozlerNullUid?.c,
                    sozler_duplicates: sozlerDupUid
                },
                inventory: {
                    total_sections: totalSections?.c,
                    total_paragraphs: totalParagraphs?.c,
                    work_distribution: bookIdBreakdown,
                    distinct_works: distinctWorks,
                    null_or_empty_book_id: nullOrEmptyBookId?.c,
                    mektubat_stats: {
                        work_id_count: mektubatByWorkId?.c,
                        book_id_count: mektubatByBookId?.c,
                        null_book_id: mektubatNullBookId?.c,
                        dup_uids: mektubatDupUid
                    }
                },
                mektubat_verification: {
                    by_work_id: mektubatByWorkId?.c,
                    by_book_id: mektubatByBookId?.c,
                    null_book_id_count: mektubatNullBookId?.c,
                    null_uid_count: (await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM sections WHERE work_id='mektubat' AND (section_uid IS NULL OR section_uid='')"))?.c,
                    sample_uids: (await db.getAllAsync<{ section_uid: string }>("SELECT section_uid FROM sections WHERE work_id='mektubat' LIMIT 5")).map(r => r.section_uid),
                    top_level_count: (await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM sections WHERE work_id='mektubat' AND (parent_id IS NULL OR parent_id=0)"))?.c,
                    paragraphs_check: {
                        total: (await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM paragraphs WHERE section_id IN (SELECT id FROM sections WHERE work_id='mektubat')"))?.c,
                        first_section_uid: await db.getFirstAsync<{ section_uid: string }>("SELECT section_uid FROM sections WHERE work_id='mektubat' LIMIT 1"),
                        first_section_p_count: (await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM paragraphs WHERE section_id = (SELECT id FROM sections WHERE work_id='mektubat' LIMIT 1)"))?.c
                    },
                    type_stats: await db.getAllAsync("SELECT type, COUNT(*) c FROM sections WHERE work_id='mektubat' GROUP BY type"),
                    sample_rows: MektubatSample,
                    duplicates: mektubatDupUid
                },
                lemalar_verification: {
                    sections: lemDoc?.c || 0,
                    by_book_id: lemBook?.c || 0,
                    paragraphs: lemPara?.c || 0,
                    orphan_paragraphs: lemOrphan?.c || 0,
                    null_uid: lemNullUid?.c || 0,
                    duplicates: lemDupUid
                },
                schema_info: {
                    columns: tableInfo.map((c: any) => c.name),
                    indexes: indexList
                },
                samples: {
                    lemalar_sections: lemSample,
                    lemalar_paragraphs_sample: lemParaSample
                }
            };

            setResults(report);
            setLastRun(new Date().toLocaleTimeString());

        } catch (error) {
            const err = error as any;
            setResults({ error: err.message, stack: err.stack } as any);
        } finally {
            setLoading(false);
        }
    };



    const copyResults = async () => {
        if (results) {
            await Clipboard.setStringAsync(JSON.stringify(results, null, 2));
            Alert.alert('Copied', 'Results copied to clipboard');
        }
    };

    const handleForceReinstall = () => {
        Alert.alert(
            'Zorla DB Kurulumu',
            'Mevcut veritabanı silinip asset klasöründeki risale.db kopyalanacak. Onaylıyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Yükle',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await reinstallContentDbAsset();
                            Alert.alert('Başarılı', 'DB yeniden kuruldu. Lütfen uygulamayı tamamen kapatıp açın (Reload yetmeyebilir).');
                        } catch (e) {
                            Alert.alert('Hata', String(e));
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Geliştirici Kontrol</Text>
                <Text style={styles.subtitle}>DB Sağlık & Bütünlük Doğrulama (Read-Only)</Text>
                {results && (
                    <View style={{ marginTop: 10, padding: 5, backgroundColor: '#eef', borderRadius: 4 }}>
                        <Text style={[styles.text, { fontWeight: 'bold', fontSize: 13 }]}>Lemalar Deep Scan:</Text>
                        <Text style={styles.text}>Sections (WorkID): {results.lemalar_verification?.sections ?? 0}</Text>
                        <Text style={styles.text}>Sections (BookID): {results.lemalar_verification?.by_book_id ?? 0}</Text>
                        <Text style={styles.text}>Paragraphs (Joined): {results.lemalar_verification?.paragraphs ?? 0}</Text>
                        <Text style={[styles.text, { color: results.lemalar_verification?.orphan_paragraphs ? 'red' : 'green' }]}>
                            Orphans: {results.lemalar_verification?.orphan_paragraphs ?? 0}
                        </Text>
                        <Text style={styles.text}>Null UIDs: {results.lemalar_verification?.null_uid ?? 0}</Text>
                    </View>
                )}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={runHealthCheck}
                    disabled={loading}
                >
                    <Ionicons name="pulse" size={20} color="white" style={{ marginRight: 8 }} />
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>DB Sağlığını Kontrol Et</Text>}
                </TouchableOpacity>

                {results && (
                    <TouchableOpacity style={[styles.button, styles.copyButton]} onPress={copyResults}>
                        <Ionicons name="copy-outline" size={20} color="white" />
                    </TouchableOpacity>
                )}

                {__DEV__ && (
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: '#F43F5E', flex: 0, width: 48 }]}
                        onPress={handleForceReinstall}
                    >
                        <Ionicons name="construct-outline" size={20} color="white" />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.content}>
                {results ? (
                    <Text style={styles.jsonText}>{JSON.stringify(results, null, 2)}</Text>
                ) : (
                    <Text style={styles.placeholder}>Sonuçları görmek için kontrolü başlatın.</Text>
                )}
            </ScrollView>

            {lastRun ? <Text style={styles.footer}>Son Çalıştırma: {lastRun}</Text> : null}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    text: {
        fontSize: 12,
        color: '#333',
        marginBottom: 2
    },
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
    },
    button: {
        backgroundColor: '#0EA5E9',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    copyButton: {
        flex: 0,
        width: 48,
        backgroundColor: '#64748B',
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    jsonText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        fontSize: 12,
        color: '#334155',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    placeholder: {
        textAlign: 'center',
        color: '#94A3B8',
        marginTop: 40,
    },
    footer: {
        padding: 12,
        textAlign: 'center',
        color: '#64748B',
        fontSize: 12,
    }
});
