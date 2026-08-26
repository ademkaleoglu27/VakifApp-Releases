import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/config/theme';
import { LESSONS, Lesson } from '../data/elifbaData';

const COMPLETED_LESSONS_KEY = '@elifba_completed_lessons_v1';

export const EducationHomeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [completedLessons, setCompletedLessons] = useState<number[]>([]);

    useEffect(() => {
        loadProgress();
    }, []);

    const loadProgress = async () => {
        try {
            const saved = await AsyncStorage.getItem(COMPLETED_LESSONS_KEY);
            if (saved) {
                setCompletedLessons(JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Failed to load elifba progress', e);
        }
    };

    const progressPercentage = Math.round((completedLessons.length / LESSONS.length) * 100);

    const handleLessonPress = (lesson: Lesson) => {
        navigation.navigate('ElifBa', { lessonId: lesson.id });
    };

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'harfler': return { text: 'Harfler', bg: '#DCFCE7', color: '#15803D' };
            case 'harekeler': return { text: 'Harekeler', bg: '#FEE2E2', color: '#B91C1C' };
            case 'kaideler': return { text: 'Kaideler', bg: '#FEF3C7', color: '#B45309' };
            case 'sureler': return { text: 'Sureler', bg: '#E0F2FE', color: '#0369A1' };
            default: return { text: 'Ders', bg: '#F1F5F9', color: '#475569' };
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Premium Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Kur'an Eğitimi</Text>
                        <Text style={styles.headerSubtitle}>Sıfırdan Zirveye Kolay Elif-Ba</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.infoButton}
                        onPress={() => handleLessonPress(LESSONS[0])}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="play-circle" size={28} color="#FBBF24" />
                    </TouchableOpacity>
                </View>

                {/* Progress Card */}
                <View style={styles.progressCard}>
                    <View style={styles.progressTopRow}>
                        <View>
                            <Text style={styles.progressLabel}>Genel İlerleme Durumu</Text>
                            <Text style={styles.progressCountText}>
                                {completedLessons.length} / {LESSONS.length} Ders Tamamlandı
                            </Text>
                        </View>
                        <View style={styles.progressPercentageBadge}>
                            <Text style={styles.progressPercentageText}>%{progressPercentage}</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarBackground}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${Math.max(progressPercentage, 4)}%` }
                            ]}
                        />
                    </View>

                    <Text style={styles.progressMotivation}>
                        {progressPercentage === 100
                            ? '🎉 Tebrikler! Tüm müfredatı tamamladınız.'
                            : progressPercentage > 50
                            ? '⚡ Harika gidiyorsunuz! Kur\'an okumaya çok az kaldı.'
                            : '📖 Günde 1 ders ile 10 günde Kur\'an\'a geçin.'}
                    </Text>
                </View>
            </View>

            {/* Lesson List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Müfredat Adımları</Text>
                    <Text style={styles.sectionSubtitle}>10 Kademeli Kolay Öğrenme Metodu</Text>
                </View>

                {LESSONS.map((lesson, index) => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    const isNextToLearn = !isCompleted && (index === 0 || completedLessons.includes(LESSONS[index - 1].id));
                    const badge = getCategoryBadge(lesson.category);

                    return (
                        <TouchableOpacity
                            key={lesson.id}
                            style={[
                                styles.lessonCard,
                                isCompleted && styles.lessonCardCompleted,
                                isNextToLearn && styles.lessonCardActive
                            ]}
                            onPress={() => handleLessonPress(lesson)}
                            activeOpacity={0.8}
                        >
                            {/* Number & Status Indicator */}
                            <View
                                style={[
                                    styles.numberCircle,
                                    isCompleted
                                        ? styles.numberCircleCompleted
                                        : isNextToLearn
                                        ? styles.numberCircleActive
                                        : styles.numberCircleDefault
                                ]}
                            >
                                {isCompleted ? (
                                    <Ionicons name="checkmark" size={20} color="#ffffff" />
                                ) : (
                                    <Text
                                        style={[
                                            styles.numberText,
                                            isNextToLearn && styles.numberTextActive
                                        ]}
                                    >
                                        {lesson.id}
                                    </Text>
                                )}
                            </View>

                            {/* Info */}
                            <View style={styles.lessonInfo}>
                                <View style={styles.lessonBadgeRow}>
                                    <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
                                        <Text style={[styles.categoryBadgeText, { color: badge.color }]}>
                                            {badge.text}
                                        </Text>
                                    </View>
                                    {isCompleted && (
                                        <Text style={styles.completedBadgeText}>Tamamlandı</Text>
                                    )}
                                    {isNextToLearn && (
                                        <Text style={styles.activeBadgeText}>Sıradaki Ders</Text>
                                    )}
                                </View>

                                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                                <Text style={styles.lessonSubtitle}>{lesson.subtitle}</Text>
                            </View>

                            {/* Arrow */}
                            <View style={styles.arrowContainer}>
                                <Ionicons
                                    name="chevron-forward"
                                    size={20}
                                    color={isNextToLearn ? theme.colors.primary : '#94A3B8'}
                                />
                            </View>
                        </TouchableOpacity>
                    );
                })}

                <View style={styles.footerNote}>
                    <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
                    <Text style={styles.footerNoteText}>
                        Her dersin sonunda bulunan mini alıştırma ve testleri çözerek bilgilerinizi pekiştirebilirsiniz.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 16 : 8,
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: 0.3,
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    infoButton: {
        padding: 4,
    },
    progressCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
    },
    progressTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    progressCountText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 2,
    },
    progressPercentageBadge: {
        backgroundColor: theme.colors.primaryContainer,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    progressPercentageText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 4,
    },
    progressMotivation: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 40,
    },
    sectionHeader: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    lessonCard: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    lessonCardActive: {
        borderColor: theme.colors.accent,
        borderWidth: 1.5,
        backgroundColor: '#F0FDF4',
    },
    lessonCardCompleted: {
        borderColor: '#E2E8F0',
        backgroundColor: '#FAFDFB',
    },
    numberCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    numberCircleDefault: {
        backgroundColor: '#F1F5F9',
    },
    numberCircleActive: {
        backgroundColor: theme.colors.primary,
    },
    numberCircleCompleted: {
        backgroundColor: '#10B981',
    },
    numberText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#64748B',
    },
    numberTextActive: {
        color: '#ffffff',
    },
    lessonInfo: {
        flex: 1,
    },
    lessonBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    completedBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#10B981',
    },
    activeBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    lessonTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    lessonSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    arrowContainer: {
        marginLeft: 8,
        padding: 4,
    },
    footerNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primaryContainer,
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
        gap: 12,
    },
    footerNoteText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.primary,
        lineHeight: 18,
        fontWeight: '500',
    }
});
