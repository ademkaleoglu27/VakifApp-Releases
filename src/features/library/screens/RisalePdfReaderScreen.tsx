/**
 * RisalePdfReaderScreen.tsx
 * 
 * Features added:
 * 1. View Mode Toggle: Switch between "Sayfa" (Horizontal Paging) and "Akış" (Vertical Scrolling).
 *    - Vertical mode allows continuous reading and better zooming, addressing the "small text" issue.
 * 2. Immersive Mode: Single tap toggles Header/Footer visibility to use full screen height.
 * 3. Quick Jump: Retained in footer.
 */

import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    StatusBar,
    Alert,
    Keyboard,
    Platform,
    Modal,
    Pressable
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Pdf from 'react-native-pdf';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RisaleDownloadService } from '@/services/risaleDownloadService';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';

const PAGE_CHANGE_DEBOUNCE = 500;

export const RisalePdfReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { bookId, title, uri } = route.params;

    // State
    const [isReady, setIsReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);

    // Reading Mode: 'horizontal' (Paged) or 'vertical' (Scroll)
    // Default to horizontal (Applies to "Book" feel)
    const [isHorizontal, setIsHorizontal] = useState(true);

    // Immersive Mode (Full Screen)
    const [isImmersive, setIsImmersive] = useState(false);

    // Page State
    const [pdfPage, setPdfPage] = useState<number>(1);
    const [uiPage, setUiPage] = useState<number>(1);

    // Jump / Footer State
    const [isJumpMode, setIsJumpMode] = useState(false);
    const [jumpText, setJumpText] = useState('');

    const [showOnboarding, setShowOnboarding] = useState(false);

    // Notes & Bookmarks
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isNoteModalVisible, setNoteModalVisible] = useState(false);
    const [noteText, setNoteText] = useState('');

    const saveTimeout = useRef<NodeJS.Timeout | null>(null);
    const pdfRef = useRef<any>(null);

    // Check bookmark status on page change
    useEffect(() => {
        const checkBookmark = async () => {
            const status = await RisaleUserDb.isBookmarked(bookId, uiPage);
            setIsBookmarked(status);
        };
        checkBookmark();
    }, [bookId, uiPage]);

    // Initial Onboarding Check
    useEffect(() => {
        const checkOnboarding = async () => {
            const hasSeen = await AsyncStorage.getItem('risale_guide_v2'); // Increment version if needed
            if (!hasSeen) {
                setShowOnboarding(true);
            }
        };
        checkOnboarding();
    }, []);

    const closeOnboarding = async () => {
        setShowOnboarding(false);
        await AsyncStorage.setItem('risale_guide_v2', 'true');
    };

    // 1. Setup & Load Progress
    useEffect(() => {
        navigation.setOptions({
            title: title || 'Risale Okuma',
            headerShown: !isImmersive,
            headerBackTitle: 'Geri',
            headerRight: () => (
                <View style={{ flexDirection: 'row', gap: 15, marginRight: 10 }}>
                    <TouchableOpacity onPress={() => handleToggleBookmark()}>
                        <Ionicons
                            name={isBookmarked ? "bookmark" : "bookmark-outline"}
                            size={24}
                            color={isBookmarked ? theme.colors.secondary : theme.colors.primary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setNoteModalVisible(true)}>
                        <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
            )
        });
    }, [isImmersive, navigation, title, isBookmarked]);

    const handleToggleBookmark = async () => {
        const newState = await RisaleUserDb.toggleBookmark(bookId, uiPage);
        setIsBookmarked(newState);
    };

    const handleSaveNote = async () => {
        if (!noteText.trim()) {
            setNoteModalVisible(false);
            return;
        }
        await RisaleUserDb.saveNote(bookId, uiPage, noteText);
        setNoteModalVisible(false);
        setNoteText('');
        Alert.alert('Başarılı', 'Notunuz kaydedildi.');
    };

    // Handle URI Resolution or Asset Source
    const [resolvedSource, setResolvedSource] = useState<any>(null);

    useEffect(() => {
        if (route.params.assetSource) {
            setResolvedSource(route.params.assetSource);
        } else if (uri) {
            setResolvedSource({ uri, cache: true });
        } else if (bookId) {
            const path = `${FileSystem.documentDirectory}risale/${bookId}.pdf`;
            setResolvedSource({ uri: path, cache: true });
        }
    }, [uri, bookId, route.params.assetSource]);

    useEffect(() => {
        const loadProgress = async () => {
            try {
                // Check for 'initialPage' from Search
                const initialJump = route.params.initialPage;
                if (initialJump) {
                    setPdfPage(initialJump);
                    setUiPage(initialJump);
                } else {
                    // Normal Progress Load
                    const progress = await RisaleDownloadService.getProgress(bookId);
                    if (progress && progress.lastPage > 1) {
                        setPdfPage(progress.lastPage);
                        setUiPage(progress.lastPage);
                    }
                }
            } catch (e) {
                console.warn('Failed to load progress', e);
            } finally {
                setIsReady(true);
            }
        };
        loadProgress();
    }, [bookId, route.params.initialPage]);

    // 2. Page Change Handler
    const handlePageChange = useCallback((page: number, numberOfPages: number) => {
        setUiPage(page);
        if (numberOfPages > 0) setTotalPages(numberOfPages);

        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
            RisaleDownloadService.saveProgress(bookId, page);
        }, PAGE_CHANGE_DEBOUNCE);
    }, [bookId]);

    // 3. Jump Logic
    const toggleJumpMode = () => {
        if (isJumpMode) {
            setIsJumpMode(false);
            Keyboard.dismiss();
        } else {
            setJumpText(uiPage.toString());
            setIsJumpMode(true);
        }
    };

    const handleJump = () => {
        const target = parseInt(jumpText, 10);
        if (!isNaN(target) && target >= 1 && target <= totalPages) {
            setPdfPage(target);
            setUiPage(target);
            setIsJumpMode(false);
            Keyboard.dismiss();

            // If in vertical mode, we might need a manual scroll trigger if prop doesn't do it?
            // react-native-pdf handles page prop in both modes.
        } else {
            Alert.alert('Geçersiz Sayfa', `Lütfen 1 ile ${totalPages} arasında bir sayı girin.`);
        }
    };

    const toggleViewMode = () => {
        setIsHorizontal(!isHorizontal);
        // Force PDF reload/redraw might happen, but state is preserved
    };

    if (!isReady) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#0F766E" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle={isImmersive ? "light-content" : "dark-content"}
                backgroundColor={isImmersive ? "#000" : "#F3F4F6"}
                hidden={isImmersive}
            />

            <Pdf
                ref={pdfRef}
                source={resolvedSource}
                page={pdfPage}
                horizontal={isHorizontal}
                enablePaging={isHorizontal} // Paging only in horizontal mode
                spacing={isHorizontal ? 0 : 10} // Add spacing in vertical scroll
                fitPolicy={0} // Width
                minScale={1.0}
                maxScale={4.0} // Increased max scale for better zoom
                enableAntialiasing={true}
                onLoadComplete={(numberOfPages) => {
                    setLoading(false);
                    setTotalPages(numberOfPages);
                }}
                onPageChanged={handlePageChange}
                onPageSingleTap={() => {
                    if (isJumpMode) {
                        setIsJumpMode(false);
                        Keyboard.dismiss();
                    } else {
                        setIsImmersive(!isImmersive);
                    }
                }}
                trustAllCerts={false}
                style={[styles.pdf, isImmersive && styles.pdfImmersive]}
                renderActivityIndicator={() => <ActivityIndicator size="small" color="#0F766E" />}
                onError={(error) => {
                    setLoading(false);
                    Alert.alert('Hata', 'Kitap yüklenirken bir sorun oluştu.');
                }}
            />

            {loading && (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#0F766E" />
                    <Text style={{ marginTop: 10, color: '#333' }}>Sayfalar hazırlanıyor...</Text>
                </View>
            )}

            {/* Footer - Hides in Immersive Mode */}
            {!isImmersive && (
                <View style={styles.footerContainer}>
                    {/* Mode Toggle Button */}
                    <TouchableOpacity style={styles.modeButton} onPress={toggleViewMode}>
                        <Ionicons
                            name={isHorizontal ? "list-outline" : "book-outline"}
                            size={20}
                            color="#fff"
                        />
                        <Text style={styles.modeText}>
                            {isHorizontal ? "Akış" : "Sayfa"}
                        </Text>
                    </TouchableOpacity>

                    {/* Page Indicator / Jump */}
                    <TouchableOpacity
                        style={styles.pagePill}
                        activeOpacity={0.9}
                        onPress={toggleJumpMode}
                    >
                        {isJumpMode ? (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={jumpText}
                                    onChangeText={setJumpText}
                                    keyboardType="numeric"
                                    returnKeyType="go"
                                    onSubmitEditing={handleJump}
                                    autoFocus={true}
                                    selectTextOnFocus={true}
                                    onBlur={() => setIsJumpMode(false)}
                                    placeholderTextColor="#999"
                                />
                                <TouchableOpacity onPress={handleJump} style={styles.goButton}>
                                    <Text style={styles.goText}>Git</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={styles.pageText}>
                                {uiPage} / {totalPages || '-'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Onboarding Overlay */}
            {showOnboarding && (
                <View style={styles.onboardingOverlay}>
                    <View style={styles.onboardingCard}>
                        <Ionicons name="information-circle" size={48} color="#0F766E" style={{ marginBottom: 10 }} />
                        <Text style={styles.onboardingTitle}>Yeni Okuma Modu</Text>

                        <Text style={styles.onboardingText}>
                            <Text style={{ fontWeight: 'bold' }}>• Sayfa Modu:</Text> Kitap gibi sayfaları çevirin.{"\n"}
                            <Text style={{ fontWeight: 'bold' }}>• Akış Modu:</Text> Aşağı doğru kaydırın (Zoom için ideal).{"\n\n"}
                            Ayrıca ekrana <Text style={{ fontWeight: 'bold' }}>tek dokunarak</Text> tam ekran moduna geçebilirsiniz.
                        </Text>

                        <TouchableOpacity style={styles.onboardingButton} onPress={closeOnboarding}>
                            <Text style={styles.onboardingButtonText}>Anlaşıldı</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Note Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isNoteModalVisible}
                onRequestClose={() => setNoteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Not Ekle (Sayfa {uiPage})</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Notunuzu buraya yazın..."
                            multiline
                            value={noteText}
                            onChangeText={setNoteText}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setNoteModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSaveNote}
                            >
                                <Text style={styles.saveButtonText}>Kaydet</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pdf: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    pdfImmersive: {
        backgroundColor: '#000', // Darker bg in immersive for focus
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(243,244,246, 0.95)',
        zIndex: 10,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        zIndex: 20,
    },
    modeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 6,
    },
    modeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    pagePill: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
        height: 38,
    },
    pageText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 0,
        width: 60,
        textAlign: 'center',
        fontSize: 14,
        color: '#000',
        height: 28,
    },
    goButton: {
        backgroundColor: '#0F766E',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    goText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Onboarding Styles
    onboardingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        padding: 20
    },
    onboardingCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 340,
        alignItems: 'center',
        elevation: 10
    },
    onboardingTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F766E',
        marginBottom: 12,
        textAlign: 'center'
    },
    onboardingText: {
        fontSize: 15,
        color: '#333',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22
    },
    onboardingButton: {
        backgroundColor: '#0F766E',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        elevation: 2
    },
    onboardingButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        elevation: 5
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 16
    },
    modalInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 12,
        height: 120,
        textAlignVertical: 'top',
        fontSize: 16,
        marginBottom: 16
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8
    },
    cancelButton: {
        backgroundColor: '#E5E7EB'
    },
    saveButton: {
        backgroundColor: theme.colors.primary
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: '600'
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold'
    }
});
