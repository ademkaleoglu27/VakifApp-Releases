import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSectionsByWork } from '@/services/risaleRepo';
import { RisaleSection } from '@/types/risale';

interface GroupedSection {
    main: RisaleSection;
    children: RisaleSection[];
}

export const RisaleVirtualPageSectionList = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { workId, workTitle } = route.params;

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    const { data: sections, isLoading } = useQuery({
        queryKey: ['sections', workId],
        queryFn: () => getSectionsByWork(workId),
    });

    // Group sections by parent
    const groupedSections = useMemo(() => {
        if (!sections) return [];

        const mainSections: GroupedSection[] = [];
        const childMap = new Map<string, RisaleSection[]>();

        // First pass: collect children
        for (const section of sections) {
            if (section.parent_id) {
                if (!childMap.has(section.parent_id)) {
                    childMap.set(section.parent_id, []);
                }
                childMap.get(section.parent_id)!.push(section);
            }
        }

        // Second pass: build grouped structure
        for (const section of sections) {
            if (!section.parent_id && section.type === 'main') {
                mainSections.push({
                    main: section,
                    children: childMap.get(section.id) || []
                });
            }
        }

        return mainSections;
    }, [sections]);

    const toggleExpand = (sectionId: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            } else {
                newSet.add(sectionId);
            }
            return newSet;
        });
    };

    const navigateToSection = (section: RisaleSection) => {
        navigation.navigate('RisaleVirtualPageReader', {
            bookId: workId,
            sectionId: section.id,
            sectionTitle: section.title,
            workTitle: workTitle,
        });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>{workTitle}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {groupedSections.map((group) => {
                    const isExpanded = expandedSections.has(group.main.id);
                    const hasChildren = group.children.length > 0;

                    return (
                        <View key={group.main.id}>
                            {/* Main Section */}
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => navigateToSection(group.main)}
                                onLongPress={() => hasChildren && toggleExpand(group.main.id)}
                            >
                                <View style={styles.itemIcon}>
                                    <Text style={styles.itemIndex}>{group.main.section_index}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemTitle}>{group.main.title}</Text>
                                    {hasChildren && (
                                        <Text style={styles.childCount}>
                                            {group.children.length} alt bölüm
                                        </Text>
                                    )}
                                </View>
                                {hasChildren && (
                                    <TouchableOpacity
                                        style={styles.expandBtn}
                                        onPress={() => toggleExpand(group.main.id)}
                                    >
                                        <Ionicons
                                            name={isExpanded ? "chevron-up" : "chevron-down"}
                                            size={20}
                                            color="#0EA5E9"
                                        />
                                    </TouchableOpacity>
                                )}
                                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                            </TouchableOpacity>

                            {/* Child Sections (Collapsible) */}
                            {isExpanded && group.children.map((child) => (
                                <TouchableOpacity
                                    key={child.id}
                                    style={styles.subItem}
                                    onPress={() => navigateToSection(child)}
                                >
                                    <View style={styles.subItemIcon}>
                                        <Ionicons name="remove-outline" size={14} color="#94A3B8" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.subItemTitle}>{child.title}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backBtn: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        flex: 1,
    },
    list: {
        padding: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    subItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 24,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 8,
        marginBottom: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#0EA5E9',
    },
    itemIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0F9FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    subItemIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    itemIndex: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0EA5E9',
    },
    itemTitle: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
    },
    subItemTitle: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '400',
    },
    childCount: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    expandBtn: {
        padding: 8,
        marginRight: 4,
    },
});
