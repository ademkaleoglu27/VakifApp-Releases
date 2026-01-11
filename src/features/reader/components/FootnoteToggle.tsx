import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFootnotesBySectionId } from '@/services/risaleRepo';
import { RisaleChunk } from '@/types/risale';

/**
 * FootnoteToggle (Diamond Standard V23.1 - LOCKED)
 * 
 * Displays a collapsed footnote indicator that expands on tap.
 * Uses LOCAL state only - no global re-renders.
 * Lazy loads footnote content on first expand.
 * 
 * LOCKED: Do not modify state management or fetch logic.
 */

interface FootnoteToggleProps {
    sectionId: string;
    footnoteNumber: number;
    fontSize: number;
}

export const FootnoteToggle = React.memo(({ sectionId, footnoteNumber, fontSize }: FootnoteToggleProps) => {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState<RisaleChunk[] | null>(null);
    const [notFound, setNotFound] = useState(false); // Fail-soft: hide if not found

    const handleToggle = useCallback(async () => {
        // If already marked as not found, do nothing (fail-soft)
        if (notFound) return;

        if (expanded) {
            // Just collapse, don't refetch
            setExpanded(false);
            return;
        }

        // Expand - fetch if not cached locally
        if (!content && !loading) {
            setLoading(true);
            try {
                const footnotes = await getFootnotesBySectionId(sectionId);
                // Find the matching footnote by number
                const match = footnotes.find(fn => {
                    const fnNum = fn.title.match(/^\[(\d+)\]/);
                    return fnNum && parseInt(fnNum[1], 10) === footnoteNumber;
                });

                if (match && match.chunks.length > 0) {
                    setContent(match.chunks);
                    setExpanded(true);
                } else {
                    // Fail-soft: mark as not found, don't show error
                    setNotFound(true);
                }
            } catch (e) {
                console.warn('Footnote not found:', sectionId, footnoteNumber);
                setNotFound(true); // Fail-soft
            } finally {
                setLoading(false);
            }
        } else if (content) {
            setExpanded(true);
        }
    }, [expanded, content, loading, sectionId, footnoteNumber, notFound]);

    // Fail-soft: Don't render anything if footnote not found
    if (notFound) return null;

    return (
        <View style={styles.container}>
            {/* Toggle Button */}
            <TouchableOpacity style={styles.toggle} onPress={handleToggle}>
                <Ionicons
                    name={expanded ? "chevron-up-circle" : "document-text-outline"}
                    size={16}
                    color="#795548"
                />
                <Text style={styles.toggleText}>
                    {loading ? 'Yükleniyor...' : expanded ? `Dipnot ${footnoteNumber}'i kapat` : `Dipnot ${footnoteNumber}'i göster`}
                </Text>
            </TouchableOpacity>

            {/* Expanded Content */}
            {expanded && content && (
                <View style={styles.content}>
                    {content.map((chunk, idx) => (
                        <Text
                            key={`fn-chunk-${idx}`}
                            style={[styles.footnoteText, { fontSize: fontSize * 0.9 }]}
                        >
                            {chunk.text_tr}
                        </Text>
                    ))}
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        marginBottom: 4,
        paddingLeft: 8,
        borderLeftWidth: 2,
        borderLeftColor: '#D4A574',
    },
    toggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    toggleText: {
        marginLeft: 6,
        fontSize: 13,
        color: '#795548',
        fontStyle: 'italic',
    },
    content: {
        marginTop: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#FDF8F0',
        borderRadius: 6,
    },
    footnoteText: {
        color: '#5D4037',
        lineHeight: 22,
        marginBottom: 6,
    },
    errorText: {
        fontSize: 12,
        color: '#B3261E',
        fontStyle: 'italic',
    },
});
