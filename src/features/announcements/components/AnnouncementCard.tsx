import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, Linking } from 'react-native';
import { Announcement } from '@/types/announcement';
import { theme } from '@/config/theme';
import { useMarkAssignmentAsRead, useDeleteAnnouncement } from '@/features/announcements/hooks/useAnnouncements';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';

interface AnnouncementCardProps {
    announcement: Announcement;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ announcement }) => {
    const [expanded, setExpanded] = useState(false);
    const markAsReadMutation = useMarkAssignmentAsRead();
    const deleteMutation = useDeleteAnnouncement();

    const handleDelete = () => {
        Alert.alert(
            'Duyuruyu Sil',
            'Bu duyuruyu silmek istediğinize emin misiniz?',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(announcement.id)
                }
            ]
        );
    };

    const handlePress = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
        if (!announcement.isRead) {
            markAsReadMutation.mutate(announcement.id);
        }
    };

    const handleGetDirections = () => {
        if (!announcement.location) return;
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const url = Platform.select({
            ios: `${scheme}${encodeURIComponent(announcement.location)}`,
            android: `${scheme}${encodeURIComponent(announcement.location)}`
        });

        Linking.openURL(url || '');
    };

    const isHighPriority = announcement.priority === 'high';

    return (
        <TouchableOpacity
            style={[
                styles.card,
                !announcement.isRead && styles.unreadCard,
                isHighPriority && styles.highPriorityCard
            ]}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    {isHighPriority && <Text style={styles.priorityBadge}>!</Text>}
                    <Text style={[styles.title, !announcement.isRead && styles.unreadTitle]}>
                        {announcement.title}
                    </Text>
                </View>
                <Text style={styles.date}>
                    {new Date(announcement.date).toLocaleDateString('tr-TR')}
                </Text>
                {expanded && (
                    <TouchableOpacity onPress={handleDelete} style={{ marginLeft: 8 }}>
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                )}
            </View>

            {expanded && (
                <View style={styles.contentContainer}>
                    <Text style={styles.content}>{announcement.content}</Text>

                    {announcement.location && (
                        <View style={styles.locationContainer}>
                            <View style={styles.locationInfo}>
                                <Ionicons name="location-sharp" size={16} color={theme.colors.secondary} />
                                <Text style={styles.locationText}>{announcement.location}</Text>
                            </View>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
                                    <Text style={styles.directionsButtonText}>Yol Tarifi</Text>
                                    <Ionicons name="map-outline" size={18} color={theme.colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.directionsButton, styles.whatsappButton]} onPress={() => {
                                    const message = `*${announcement.title}*\n${announcement.content}\n\n📍 *Konum:* ${announcement.location}`;
                                    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
                                }}>
                                    <Text style={[styles.directionsButtonText, styles.whatsappButtonText]}>Paylaş</Text>
                                    <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.roundness.medium,
        marginBottom: theme.spacing.s,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    unreadCard: {
        backgroundColor: theme.colors.surface,
        borderLeftColor: theme.colors.primary,
        borderWidth: 1, // Visual distinction for unread
        borderColor: theme.colors.primary + '20',
    },
    highPriorityCard: {
        borderLeftColor: theme.colors.error,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    priorityBadge: {
        color: theme.colors.error,
        fontWeight: 'bold',
        fontSize: 18,
        marginRight: theme.spacing.s,
    },
    title: {
        fontSize: 16,
        color: theme.colors.onSurface,
        flex: 1,
    },
    unreadTitle: {
        fontWeight: 'bold',
    },
    date: {
        fontSize: 12,
        color: theme.colors.onSurfaceVariant,
        marginLeft: theme.spacing.s,
    },
    contentContainer: {
        marginTop: theme.spacing.m,
        paddingTop: theme.spacing.s,
        borderTopWidth: 1,
        borderTopColor: theme.colors.outline + '20',
    },
    content: {
        fontSize: 14,
        color: theme.colors.onSurfaceVariant,
        lineHeight: 20,
    },
    locationContainer: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 4
    },
    locationText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '500'
    },
    directionsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0f2fe',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 6
    },
    directionsButtonText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: 'bold'
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'flex-end',
        marginTop: 8
    },
    whatsappButton: {
        backgroundColor: '#25D366',
    },
    whatsappButtonText: {
        color: '#fff'
    }
});
