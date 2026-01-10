import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { dictionaryDb, DictionaryEntry } from '@/services/dictionaryDb';
import { Ionicons } from '@expo/vector-icons';
import { LugatService } from '../../../services/lugatService';

import { normalizeText } from '../../../services/textNormalization';

interface Props {
    word: string;
    onClose: () => void;
    prevWord?: string;
    nextWord?: string;
    onExpandLeft?: () => void;
    onExpandRight?: () => void;
}

// Local normalize removed, using imported one.

export const LugatInlineCard = ({ word, onClose, prevWord, nextWord, onExpandLeft, onExpandRight }: Props) => {
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<DictionaryEntry | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let mounted = true;
        const search = async () => {
            setLoading(true);
            setNotFound(false);
            setEntry(null);

            try {
                // UNIFIED LOOKUP (V13)
                // Delegate entire search logic to LugatService (which wraps dictionaryDb).
                // This guarantees consistency between the "Smart Span" detection and this UI.

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
    }, [word]);

    if (!word) return null;

    return (
        <View style={styles.card}>
            {/* Header with Chain Controls */}
            <View style={styles.header}>
                <View style={styles.chainRow}>
                    {/* Left Expand */}
                    {prevWord && onExpandLeft ? (
                        <TouchableOpacity onPress={onExpandLeft} style={styles.chainBtn}>
                            <Ionicons name="chevron-back" size={16} color="#8D6E63" />
                            <Text style={styles.chainText}>{prevWord}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} /> // Spacer
                    )}

                    {/* Current Search Term */}
                    <Text style={styles.word}>{word}</Text>

                    {/* Right Expand */}
                    {nextWord && onExpandRight ? (
                        <TouchableOpacity onPress={onExpandRight} style={styles.chainBtn}>
                            <Text style={styles.chainText}>{nextWord}</Text>
                            <Ionicons name="chevron-forward" size={16} color="#8D6E63" />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} /> // Spacer
                    )}
                </View>

                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={24} color="#8D6E63" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="small" color="#B3261E" style={{ marginTop: 8 }} />
            ) : notFound ? (
                <Text style={styles.notFound}>Kayıt bulunamadı.</Text>
            ) : (
                <View style={styles.content}>
                    {entry?.word_osm ? (
                        <Text style={styles.osm}>{entry.word_osm}</Text>
                    ) : null}
                    <Text style={styles.def}>{entry?.definition}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFF8E1', // Light yellow card matching book theme
        borderRadius: 8,
        padding: 12,
        marginVertical: 4,
        marginHorizontal: 0,
        borderWidth: 1,
        borderColor: '#E0C097',
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
        color: '#4E342E', // Brownish text
        lineHeight: 22,
        fontFamily: 'serif',
    },
});
