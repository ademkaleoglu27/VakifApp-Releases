import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { dictionaryDb, DictionaryEntry } from '@/services/dictionaryDb';
import { Ionicons } from '@expo/vector-icons';
import { LugatService } from '../../../services/lugatService';

interface Props {
    word?: string; // Optional if entry is provided
    entry?: DictionaryEntry | null; // Direct entry injection (single/primary)

    // New props for compound lookup
    compound?: DictionaryEntry | null;
    components?: DictionaryEntry[];

    onClose: () => void;
    prevWord?: string;
    nextWord?: string;
    onExpandLeft?: () => void;
    onExpandRight?: () => void;
}

export const LugatInlineCard = ({
    word,
    entry: initialEntry,
    compound,
    components,
    onClose,
    prevWord,
    nextWord,
    onExpandLeft,
    onExpandRight
}: Props) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [entry, setEntry] = useState<DictionaryEntry | null>(initialEntry || null);
    const [notFound, setNotFound] = useState(false);

    // Determine if we are in "Compound Mode"
    const isCompoundMode = !!(compound || (components && components.length > 0));

    useEffect(() => {
        // If we have compound or components, we are done (data provided by parent)
        if (isCompoundMode) {
            setLoading(false);
            return;
        }

        // If we already have the entry, don't fetch!
        if (initialEntry) {
            setLoading(false);
            setEntry(initialEntry);
            return;
        }

        if (!word) return;

        let mounted = true;
        const search = async () => {
            setLoading(true);
            setNotFound(false);
            setEntry(null);

            try {
                const res = await LugatService.search(word);

                if (mounted) {
                    if (res) setEntry(res);
                    else setNotFound(true);
                    setLoading(false);
                }
            } catch (e) {
                if (mounted) setLoading(false);
            }
        };
        search();
        return () => { mounted = false; };
    }, [word, initialEntry, isCompoundMode, compound, components]);

    if (!word && !initialEntry && !isCompoundMode) return null;

    // Header logic (chain controls)
    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.chainRow}>
                {prevWord && onExpandLeft ? (
                    <TouchableOpacity onPress={onExpandLeft} style={styles.chainBtn}>
                        <Ionicons name="chevron-back" size={16} color="#8D6E63" />
                        <Text style={styles.chainText}>{prevWord}</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}

                <Text style={styles.word}>{word || (entry?.word_tr ?? "")}</Text>

                {nextWord && onExpandRight ? (
                    <TouchableOpacity onPress={onExpandRight} style={styles.chainBtn}>
                        <Text style={styles.chainText}>{nextWord}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#8D6E63" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={24} color="#8D6E63" />
            </TouchableOpacity>
        </View>
    );

    // Helper to render a single entry content
    const renderEntryContent = (e: DictionaryEntry) => (
        <View style={styles.content}>
            {e.word_osm ? (
                <Text style={styles.osm}>{e.word_osm}</Text>
            ) : null}
            <Text style={styles.def}>{e.definition}</Text>
        </View>
    );

    // Render logic
    return (
        <View style={styles.card}>
            {renderHeader()}

            {loading ? (
                <ActivityIndicator size="small" color="#B3261E" style={{ marginTop: 8 }} />
            ) : isCompoundMode ? (
                <View style={styles.scrollContent}>
                    {/* Compound Section */}
                    {compound && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Birleşik İfade</Text>
                            <View style={styles.compoundBox}>
                                <Text style={styles.compoundWord}>{compound.word_tr}</Text>
                                {renderEntryContent(compound)}
                            </View>
                        </View>
                    )}

                    {/* Components Section */}
                    {components && components.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                {compound ? "Bileşenler" : "Sonuçlar"}
                            </Text>
                            {components.map((comp, idx) => (
                                <View key={comp.id || idx} style={styles.componentBox}>
                                    <View style={styles.componentHeader}>
                                        <Text style={styles.componentWord}>• {comp.word_tr}</Text>
                                        {comp.word_osm && <Text style={styles.componentOsm}>{comp.word_osm}</Text>}
                                    </View>
                                    <Text style={styles.def}>{comp.definition}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Empty State for Compound Mode */}
                    {!compound && (!components || components.length === 0) && (
                        <Text style={styles.notFound}>Kayıt bulunamadı.</Text>
                    )}
                </View>
            ) : notFound ? (
                <Text style={styles.notFound}>Kayıt bulunamadı.</Text>
            ) : (
                // Classic Single Entry Mode
                entry && renderEntryContent(entry)
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFF8E1',
        borderRadius: 8,
        padding: 12,
        marginVertical: 4,
        marginHorizontal: 0,
        borderWidth: 1,
        borderColor: '#E0C097',
        maxHeight: 300,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(141, 110, 99, 0.15)',
    },
    chainRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chainBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        backgroundColor: 'rgba(141, 110, 99, 0.1)',
        borderRadius: 4,
        marginHorizontal: 8,
    },
    chainText: {
        fontSize: 12,
        color: '#5D4037',
        fontFamily: 'serif',
        marginHorizontal: 2,
    },
    word: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#3E2723',
        textAlign: 'center',
        flex: 1,
    },
    notFound: {
        color: '#8D6E63',
        fontStyle: 'italic',
        fontSize: 14,
        paddingVertical: 4,
    },
    content: {},
    osm: {
        fontFamily: 'KFGQPC_HAFS',
        fontSize: 22,
        color: '#B3261E',
        marginBottom: 4,
        textAlign: 'right',
    },
    def: {
        fontSize: 15,
        color: '#4E342E',
        lineHeight: 22,
        fontFamily: 'serif',
    },
    // New Styles for Compound Mode
    section: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#8D6E63',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    compoundBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 6,
        padding: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#B3261E',
    },
    compoundWord: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#B3261E',
        marginBottom: 4,
    },
    componentBox: {
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(141, 110, 99, 0.1)',
    },
    componentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    componentWord: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#5D4037',
    },
    componentOsm: {
        fontFamily: 'KFGQPC_HAFS',
        fontSize: 18,
        color: '#8D6E63',
    },
});
