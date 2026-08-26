import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Modal,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { AudioCacheService } from '@/services/AudioCacheService';
import { theme } from '@/config/theme';
import { LESSONS, Lesson, QuizQuestion } from '../data/elifbaData';
import { CelebrationConfettiModal } from '@/components/CelebrationConfettiModal';

const COMPLETED_LESSONS_KEY = '@elifba_completed_lessons_v1';

export const ElifBaScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const initialLessonId = route.params?.lessonId || 1;

    const [currentLessonId, setCurrentLessonId] = useState<number>(initialLessonId);
    const [activeTab, setActiveTab] = useState<'ogren' | 'alistirma' | 'test'>('ogren');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [completedLessons, setCompletedLessons] = useState<number[]>([]);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [playingText, setPlayingText] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState<boolean>(false);

    // Quiz state
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

    const lesson: Lesson = LESSONS.find(l => l.id === currentLessonId) || LESSONS[0];

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const playArabicSound = async (text: string) => {
        if (!text) return;
        try {
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
            }
            setPlayingText(text);

            let audioUri = '';
            // If it's one of the short surahs in Lesson 10
            if (text.includes('الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ') || text.includes('بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ ﴿١﴾')) {
                // Fatiha
                audioUri = 'https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/1.mp3';
            } else if (text.includes('قُلْ هُوَ اللّٰهُ اَحَدٌ')) {
                // Ihlas
                audioUri = 'https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/112.mp3';
            } else if (text.includes('قُلْ اَعُوذُ بِرَبِّ الْفَلَقِ')) {
                // Felak
                audioUri = 'https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/113.mp3';
            } else if (text.includes('قُلْ اَعُوذُ بِرَبِّ النَّاسِ')) {
                // Nas
                audioUri = 'https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/114.mp3';
            } else {
                const cleanQuery = text.length > 100 ? text.substring(0, 100) : text;
                audioUri = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&q=${encodeURIComponent(cleanQuery)}`;
            }

            const source = await AudioCacheService.resolveAudioSource({ uri: audioUri });
            const { sound: newSound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
            setSound(newSound);
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setPlayingText(null);
                }
            });
        } catch (err) {
            console.warn('[ElifBa] Audio playback error:', err);
            setPlayingText(null);
        }
    };

    useEffect(() => {
        loadCompletedLessons();
        // Reset quiz on lesson switch
        setSelectedAnswers({});
        setQuizSubmitted(false);
    }, [currentLessonId]);

    const loadCompletedLessons = async () => {
        try {
            const saved = await AsyncStorage.getItem(COMPLETED_LESSONS_KEY);
            if (saved) {
                setCompletedLessons(JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Failed to load completed lessons', e);
        }
    };

    const toggleLessonCompleted = async () => {
        try {
            let updated: number[];
            if (completedLessons.includes(lesson.id)) {
                updated = completedLessons.filter(id => id !== lesson.id);
            } else {
                updated = [...completedLessons, lesson.id];
                setShowCelebration(true);
            }
            setCompletedLessons(updated);
            await AsyncStorage.setItem(COMPLETED_LESSONS_KEY, JSON.stringify(updated));
        } catch (e) {
            console.warn('Failed to save completion status', e);
        }
    };

    const isLessonCompleted = completedLessons.includes(lesson.id);

    const handlePrevLesson = () => {
        if (currentLessonId > 1) {
            setCurrentLessonId(currentLessonId - 1);
            setActiveTab('ogren');
        }
    };

    const handleNextLesson = () => {
        if (currentLessonId < LESSONS.length) {
            setCurrentLessonId(currentLessonId + 1);
            setActiveTab('ogren');
        }
    };

    const handleSelectOption = (questionId: string, optionIndex: number) => {
        if (quizSubmitted) return;
        setSelectedAnswers(prev => ({
            ...prev,
            [questionId]: optionIndex
        }));
    };

    const calculateQuizScore = () => {
        const quizList = lesson.quiz || [];
        if (quizList.length === 0) return { correct: 0, total: 0, percentage: 100 };

        let correctCount = 0;
        quizList.forEach(q => {
            if (selectedAnswers[q.id] === q.correctIndex) {
                correctCount++;
            }
        });
        return {
            correct: correctCount,
            total: quizList.length,
            percentage: Math.round((correctCount / quizList.length) * 100)
        };
    };

    const getTypeColor = (type?: string) => {
        switch (type) {
            case 'kalin': return { bg: '#FEE2E2', text: '#B91C1C', label: 'Kalın Harf' };
            case 'peltek': return { bg: '#FEF3C7', text: '#B45309', label: 'Peltek Harf' };
            case 'ince': return { bg: '#DCFCE7', text: '#15803D', label: 'İnce Harf' };
            default: return { bg: '#F1F5F9', text: '#64748B', label: 'Standart' };
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleBox}>
                        <Text style={styles.headerLessonNumber}>DERS {lesson.id} / 10</Text>
                        <Text style={styles.headerLessonTitle} numberOfLines={1}>
                            {lesson.title.replace(`Ders ${lesson.id}: `, '')}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.headerButton,
                            isLessonCompleted && styles.headerButtonCompleted
                        ]}
                        onPress={toggleLessonCompleted}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isLessonCompleted ? "checkmark-circle" : "checkmark-circle-outline"}
                            size={24}
                            color={isLessonCompleted ? "#FBBF24" : "#ffffff"}
                        />
                    </TouchableOpacity>
                </View>

                {/* Lesson Navigation Bar */}
                <View style={styles.lessonNavBar}>
                    <TouchableOpacity
                        style={[styles.navArrowButton, currentLessonId === 1 && styles.navArrowDisabled]}
                        onPress={handlePrevLesson}
                        disabled={currentLessonId === 1}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={18} color="#ffffff" />
                        <Text style={styles.navArrowText}>Önceki</Text>
                    </TouchableOpacity>

                    <View style={styles.lessonIndicatorPills}>
                        {LESSONS.map(l => (
                            <TouchableOpacity
                                key={l.id}
                                style={[
                                    styles.pill,
                                    l.id === currentLessonId && styles.pillActive,
                                    completedLessons.includes(l.id) && styles.pillCompleted
                                ]}
                                onPress={() => {
                                    setCurrentLessonId(l.id);
                                    setActiveTab('ogren');
                                }}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.navArrowButton, currentLessonId === LESSONS.length && styles.navArrowDisabled]}
                        onPress={handleNextLesson}
                        disabled={currentLessonId === LESSONS.length}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.navArrowText}>Sonraki</Text>
                        <Ionicons name="chevron-forward" size={18} color="#ffffff" />
                    </TouchableOpacity>
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'ogren' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('ogren')}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="book-outline"
                            size={16}
                            color={activeTab === 'ogren' ? theme.colors.primary : '#ffffff'}
                        />
                        <Text style={[styles.tabText, activeTab === 'ogren' && styles.tabTextActive]}>
                            Öğren ({lesson.items.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'alistirma' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('alistirma')}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="pencil-outline"
                            size={16}
                            color={activeTab === 'alistirma' ? theme.colors.primary : '#ffffff'}
                        />
                        <Text style={[styles.tabText, activeTab === 'alistirma' && styles.tabTextActive]}>
                            Alıştırma ({lesson.practiceWords.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'test' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('test')}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="help-circle-outline"
                            size={16}
                            color={activeTab === 'test' ? theme.colors.primary : '#ffffff'}
                        />
                        <Text style={[styles.tabText, activeTab === 'test' && styles.tabTextActive]}>
                            Test ({lesson.quiz.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content Body */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Rule Summary Card */}
                <View style={styles.ruleCard}>
                    <View style={styles.ruleHeader}>
                        <Ionicons name="bulb-outline" size={20} color={theme.colors.secondary} />
                        <Text style={styles.ruleTitle}>Ders Kuralı</Text>
                    </View>
                    <Text style={styles.ruleText}>{lesson.ruleSummary}</Text>
                </View>

                {/* TAB 1: ÖĞREN & İNCELE (Adaptive Grid / List) */}
                {activeTab === 'ogren' && (
                    <View>
                        <Text style={styles.tabSectionTitle}>Harf ve Âyetlere Dokunarak Dinleyin</Text>
                        <View style={styles.gridContainer}>
                            {lesson.items.map(item => {
                                const typeInfo = getTypeColor(item.type);
                                const isLongItem = item.arabic.length > 20;

                                if (isLongItem) {
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.longSurahCard,
                                                playingText === item.arabic && styles.letterCardPlaying
                                            ]}
                                            onPress={() => {
                                                playArabicSound(item.arabic);
                                                setSelectedItem(item);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.longSurahHeader}>
                                                <View style={styles.longSurahBadge}>
                                                    <Ionicons name="book-outline" size={14} color={theme.colors.primary} />
                                                    <Text style={styles.longSurahBadgeText}>{item.title}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.longSurahPlayBtn}
                                                    onPress={() => playArabicSound(item.arabic)}
                                                >
                                                    <Ionicons
                                                        name={playingText === item.arabic ? "volume-high" : "play"}
                                                        size={18}
                                                        color="#ffffff"
                                                    />
                                                    <Text style={styles.longSurahPlayText}>
                                                        {playingText === item.arabic ? "Okunuyor..." : "Dinle"}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>

                                            <Text style={styles.longSurahArabic}>{item.arabic}</Text>

                                            {item.reading && (
                                                <Text style={styles.longSurahReading}>{item.reading}</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                }

                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.letterCard,
                                            playingText === item.arabic && styles.letterCardPlaying
                                        ]}
                                        onPress={() => {
                                            playArabicSound(item.arabic);
                                            setSelectedItem(item);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        {item.type && (
                                            <View style={[styles.cardTypeBadge, { backgroundColor: typeInfo.bg }]}>
                                                <Text style={[styles.cardTypeText, { color: typeInfo.text }]}>
                                                    {typeInfo.label.split(' ')[0]}
                                                </Text>
                                            </View>
                                        )}

                                        <Text style={styles.arabicGlyph}>{item.arabic}</Text>
                                        <Text style={styles.letterTitle}>{item.title}</Text>
                                        <View style={styles.readingAudioRow}>
                                            <Ionicons name="volume-medium-outline" size={13} color={theme.colors.primary} />
                                            <Text style={styles.letterReading}>{item.reading}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* TAB 2: ALIŞTIRMA (Practice Words) */}
                {activeTab === 'alistirma' && (
                    <View>
                        <Text style={styles.tabSectionTitle}>Kelime Okuma Pratiği</Text>
                        <Text style={styles.tabSectionSubtitle}>
                            Kelimeye dokunarak Arapça doğru telaffuzunu sesli dinleyin.
                        </Text>

                        {lesson.practiceWords.map((word, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[
                                    styles.practiceCard,
                                    playingText === word.arabic && styles.practiceCardPlaying
                                ]}
                                onPress={() => playArabicSound(word.arabic)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.practiceArabicBox}>
                                    <Text style={styles.practiceArabicText}>{word.arabic}</Text>
                                </View>
                                <View style={styles.practiceInfoBox}>
                                    <View style={styles.practiceReadingRow}>
                                        <Ionicons name="volume-high" size={16} color={theme.colors.primary} />
                                        <Text style={styles.practiceReadingText}>{word.reading}</Text>
                                    </View>
                                    {word.breakdown && (
                                        <Text style={styles.practiceBreakdownText}>
                                            Harf Harf: {word.breakdown}
                                        </Text>
                                    )}
                                    {word.meaning && (
                                        <Text style={styles.practiceMeaningText}>
                                            Anlamı: "{word.meaning}"
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* TAB 3: TEST (Interactive Quiz) */}
                {activeTab === 'test' && (
                    <View>
                        <Text style={styles.tabSectionTitle}>Bilgilerini Pekiştir</Text>
                        <Text style={styles.tabSectionSubtitle}>
                            Soruları yanıtlayarak dersi ne kadar kavradığını test et.
                        </Text>

                        {lesson.quiz.map((q, qIndex) => {
                            const selected = selectedAnswers[q.id];
                            return (
                                <View key={q.id} style={styles.quizCard}>
                                    <View style={styles.quizHeaderRow}>
                                        <Text style={styles.quizNumberText}>Soru {qIndex + 1}</Text>
                                    </View>
                                    <Text style={styles.quizQuestionText}>{q.question}</Text>

                                    {q.arabic && (
                                        <View style={styles.quizArabicHighlight}>
                                            <Text style={styles.quizArabicText}>{q.arabic}</Text>
                                        </View>
                                    )}

                                    <View style={styles.quizOptionsContainer}>
                                        {q.options.map((opt, optIndex) => {
                                            const isSelected = selected === optIndex;
                                            const isCorrect = optIndex === q.correctIndex;

                                            let btnStyle = styles.optionButtonDefault;
                                            let textStyle = styles.optionTextDefault;

                                            if (quizSubmitted) {
                                                if (isCorrect) {
                                                    btnStyle = styles.optionButtonCorrect;
                                                    textStyle = styles.optionTextCorrect;
                                                } else if (isSelected && !isCorrect) {
                                                    btnStyle = styles.optionButtonWrong;
                                                    textStyle = styles.optionTextWrong;
                                                }
                                            } else if (isSelected) {
                                                btnStyle = styles.optionButtonSelected;
                                                textStyle = styles.optionTextSelected;
                                            }

                                            return (
                                                <TouchableOpacity
                                                    key={optIndex}
                                                    style={[styles.optionButton, btnStyle]}
                                                    onPress={() => handleSelectOption(q.id, optIndex)}
                                                    activeOpacity={0.7}
                                                    disabled={quizSubmitted}
                                                >
                                                    <Text style={[styles.optionText, textStyle]}>
                                                        {opt}
                                                    </Text>
                                                    {quizSubmitted && isCorrect && (
                                                        <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                                                    )}
                                                    {quizSubmitted && isSelected && !isCorrect && (
                                                        <Ionicons name="close-circle" size={20} color="#B91C1C" />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {quizSubmitted && (
                                        <View style={styles.quizExplanationBox}>
                                            <Ionicons name="information-circle-outline" size={18} color="#0369A1" />
                                            <Text style={styles.quizExplanationText}>{q.explanation}</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        {/* Submit / Results Bar */}
                        {!quizSubmitted ? (
                            <TouchableOpacity
                                style={[
                                    styles.submitQuizButton,
                                    Object.keys(selectedAnswers).length < lesson.quiz.length && styles.submitQuizButtonDisabled
                                ]}
                                onPress={() => setQuizSubmitted(true)}
                                disabled={Object.keys(selectedAnswers).length < lesson.quiz.length}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.submitQuizButtonText}>Cevapları Kontrol Et</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.quizResultCard}>
                                <Text style={styles.quizResultTitle}>Test Sonucu</Text>
                                <Text style={styles.quizResultScore}>
                                    %{calculateQuizScore().percentage} Başarı
                                    ({calculateQuizScore().correct} / {calculateQuizScore().total} Doğru)
                                </Text>
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={() => {
                                        setSelectedAnswers({});
                                        setQuizSubmitted(false);
                                    }}
                                >
                                    <Ionicons name="refresh" size={18} color="#ffffff" />
                                    <Text style={styles.retryButtonText}>Testi Tekrar Çöz</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Bottom Complete & Next Lesson Bar */}
                <View style={styles.bottomActionCard}>
                    <TouchableOpacity
                        style={[
                            styles.completeButton,
                            isLessonCompleted && styles.completeButtonActive
                        ]}
                        onPress={toggleLessonCompleted}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={isLessonCompleted ? "checkmark-circle" : "checkmark-circle-outline"}
                            size={22}
                            color="#ffffff"
                        />
                        <Text style={styles.completeButtonText}>
                            {isLessonCompleted ? "Ders Tamamlandı ✓" : "Dersi Tamamla"}
                        </Text>
                    </TouchableOpacity>

                    {currentLessonId < LESSONS.length && (
                        <TouchableOpacity
                            style={styles.nextLessonButton}
                            onPress={handleNextLesson}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.nextLessonButtonText}>Sonraki Derse Geç</Text>
                            <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Letter Detail Modal */}
            <Modal
                visible={!!selectedItem}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedItem(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {selectedItem && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                                        <Text style={styles.modalSubtitle}>{selectedItem.reading}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.modalCloseButton}
                                        onPress={() => setSelectedItem(null)}
                                    >
                                        <Ionicons name="close" size={24} color="#64748B" />
                                    </TouchableOpacity>
                                </View>

                                {/* Big Arabic View */}
                                <View style={styles.modalBigGlyphContainer}>
                                    <Text style={styles.modalBigGlyph}>{selectedItem.arabic}</Text>
                                </View>

                                {/* Mahreç / Explanation */}
                                {selectedItem.explanation && (
                                    <View style={styles.modalTipBox}>
                                        <Ionicons name="mic-outline" size={20} color={theme.colors.primary} />
                                        <Text style={styles.modalTipText}>{selectedItem.explanation}</Text>
                                    </View>
                                )}

                                {/* Forms (Başta, Ortada, Sonda) */}
                                {selectedItem.forms && (
                                    <View style={styles.modalFormsContainer}>
                                        <Text style={styles.modalFormsTitle}>Yazılış Şekilleri:</Text>
                                        <View style={styles.modalFormsRow}>
                                            <View style={styles.formBox}>
                                                <Text style={styles.formArabic}>{selectedItem.forms.isolated}</Text>
                                                <Text style={styles.formLabel}>Yalın</Text>
                                            </View>
                                            <View style={styles.formBox}>
                                                <Text style={styles.formArabic}>{selectedItem.forms.initial}</Text>
                                                <Text style={styles.formLabel}>Başta</Text>
                                            </View>
                                            <View style={styles.formBox}>
                                                <Text style={styles.formArabic}>{selectedItem.forms.medial}</Text>
                                                <Text style={styles.formLabel}>Ortada</Text>
                                            </View>
                                            <View style={styles.formBox}>
                                                <Text style={styles.formArabic}>{selectedItem.forms.final}</Text>
                                                <Text style={styles.formLabel}>Sonda</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                <View style={styles.modalButtonsRow}>
                                    <TouchableOpacity
                                        style={styles.modalListenButton}
                                        onPress={() => playArabicSound(selectedItem.arabic)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="volume-high" size={20} color="#ffffff" />
                                        <Text style={styles.modalListenButtonText}>
                                            {playingText === selectedItem.arabic ? 'Okunuyor...' : 'Sesli Dinle'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.modalDoneButton}
                                        onPress={() => setSelectedItem(null)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.modalDoneButtonText}>Kapat</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Celebration Modal */}
            <CelebrationConfettiModal
                visible={showCelebration}
                title={`Tebrikler! ${lesson.title} Tamamlandı 🎉`}
                subtitle="Kur'an-ı Kerim öğrenme yolculuğunda önemli bir adımı daha muvaffakiyetle bitirdiniz."
                quote="Sizin en hayırlınız, Kur'an'ı öğrenen ve öğretendir."
                quoteSource="Hadis-i Şerif (Buhârî)"
                primaryButtonText={currentLessonId < LESSONS.length ? "Sonraki Derse Geç" : "Elhamdülillah"}
                onPrimaryPress={() => {
                    setShowCelebration(false);
                    if (currentLessonId < LESSONS.length) {
                        handleNextLesson();
                    }
                }}
                onClose={() => setShowCelebration(false)}
            />
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
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 12 : 4,
        paddingBottom: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerButtonCompleted: {
        backgroundColor: 'rgba(251, 191, 36, 0.25)',
    },
    headerTitleBox: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    headerLessonNumber: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#FBBF24',
        letterSpacing: 1,
    },
    headerLessonTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 2,
    },
    lessonNavBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    navArrowButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    navArrowDisabled: {
        opacity: 0.3,
    },
    navArrowText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ffffff',
    },
    lessonIndicatorPills: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pill: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    pillActive: {
        width: 18,
        backgroundColor: '#FBBF24',
    },
    pillCompleted: {
        backgroundColor: '#10B981',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 14,
        padding: 4,
        gap: 4,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
    },
    tabButtonActive: {
        backgroundColor: '#ffffff',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ffffff',
    },
    tabTextActive: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 100,
    },
    ruleCard: {
        backgroundColor: '#FFFBEB',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    ruleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    ruleTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#B45309',
    },
    ruleText: {
        fontSize: 13,
        color: '#78350F',
        lineHeight: 18,
        fontWeight: '500',
    },
    tabSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 4,
    },
    tabSectionSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 14,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
    },
    longSurahCard: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    longSurahHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    longSurahBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    longSurahBadgeText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    longSurahPlayBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    longSurahPlayText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    longSurahArabic: {
        fontSize: 22,
        lineHeight: 38,
        color: '#1E293B',
        textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
        marginBottom: 10,
    },
    longSurahReading: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 20,
        fontStyle: 'italic',
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 10,
    },
    letterCard: {
        width: '31%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 4,
    },
    cardTypeBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
    },
    cardTypeText: {
        fontSize: 9,
        fontWeight: '700',
    },
    arabicGlyph: {
        fontSize: 34,
        color: theme.colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
        marginVertical: 4,
        textAlign: 'center',
    },
    letterTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 2,
    },
    letterReading: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
        fontWeight: '500',
    },
    practiceCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    practiceArabicBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginRight: 14,
        minWidth: 90,
        alignItems: 'center',
        justifyContent: 'center',
    },
    practiceArabicText: {
        fontSize: 26,
        color: theme.colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
        textAlign: 'center',
    },
    practiceInfoBox: {
        flex: 1,
    },
    practiceReadingText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    practiceBreakdownText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    practiceMeaningText: {
        fontSize: 12,
        color: '#059669',
        fontStyle: 'italic',
        marginTop: 2,
    },
    quizCard: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    quizHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    quizNumberText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        textTransform: 'uppercase',
    },
    quizQuestionText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1E293B',
        lineHeight: 22,
        marginBottom: 12,
    },
    quizArabicHighlight: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    quizArabicText: {
        fontSize: 32,
        color: theme.colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    },
    quizOptionsContainer: {
        gap: 8,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    optionButtonDefault: {
        backgroundColor: '#F8FAFC',
        borderColor: '#E2E8F0',
    },
    optionButtonSelected: {
        backgroundColor: '#ECFDF5',
        borderColor: theme.colors.accent,
    },
    optionButtonCorrect: {
        backgroundColor: '#DCFCE7',
        borderColor: '#15803D',
    },
    optionButtonWrong: {
        backgroundColor: '#FEE2E2',
        borderColor: '#B91C1C',
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    optionTextDefault: {
        color: '#334155',
    },
    optionTextSelected: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    optionTextCorrect: {
        color: '#15803D',
        fontWeight: 'bold',
    },
    optionTextWrong: {
        color: '#B91C1C',
        fontWeight: 'bold',
    },
    quizExplanationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F0F9FF',
        borderRadius: 10,
        padding: 10,
        marginTop: 12,
    },
    quizExplanationText: {
        flex: 1,
        fontSize: 12,
        color: '#0369A1',
        lineHeight: 16,
    },
    submitQuizButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    submitQuizButtonDisabled: {
        opacity: 0.5,
    },
    submitQuizButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    quizResultCard: {
        backgroundColor: '#F0FDF4',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#86EFAC',
        marginTop: 8,
    },
    quizResultTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#15803D',
    },
    quizResultScore: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginVertical: 6,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 8,
    },
    retryButtonText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    bottomActionCard: {
        marginTop: 24,
        gap: 10,
    },
    completeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1E293B',
        borderRadius: 14,
        paddingVertical: 14,
    },
    completeButtonActive: {
        backgroundColor: '#10B981',
    },
    completeButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    nextLessonButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
    },
    nextLessonButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 2,
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBigGlyphContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        paddingVertical: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    modalBigGlyph: {
        fontSize: 72,
        color: theme.colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    },
    modalTipBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: theme.colors.primaryContainer,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    modalTipText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.primary,
        lineHeight: 18,
        fontWeight: '500',
    },
    modalFormsContainer: {
        marginTop: 6,
        marginBottom: 16,
    },
    modalFormsTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: 8,
    },
    modalFormsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    formBox: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        padding: 8,
        alignItems: 'center',
    },
    formArabic: {
        fontSize: 22,
        color: theme.colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
        marginBottom: 2,
    },
    formLabel: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
    },
    letterCardPlaying: {
        borderColor: theme.colors.primary,
        backgroundColor: '#ECFDF5',
        borderWidth: 2,
    },
    readingAudioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 2,
    },
    practiceCardPlaying: {
        borderColor: theme.colors.primary,
        backgroundColor: '#ECFDF5',
        borderWidth: 2,
    },
    practiceReadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    modalButtonsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    modalListenButton: {
        flex: 1.4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        paddingVertical: 12,
    },
    modalListenButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    modalDoneButton: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalDoneButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
    },
});
