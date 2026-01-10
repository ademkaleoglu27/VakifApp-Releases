import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Animated,
    ActivityIndicator,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { ReaderTheme } from '../../constants/theme';
import { dictionaryDb, DictionaryEntry } from '../../../../../services/dictionaryDb';

interface LugatBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    /** If provided, auto-populate and search this word when sheet opens */
    initialWord?: string;
}

/**
 * Normalizes Turkish text for dictionary lookup.
 * Removes punctuation, converts to lowercase, handles special chars.
 */
function normalizeTurkishWord(text: string): string {
    return text
        .toLowerCase()
        .replace(/[.,;:!?'"()\[\]{}«»""''…—-]/g, '')
        .trim();
}

export const LugatBottomSheet: React.FC<LugatBottomSheetProps> = ({
    visible,
    onClose,
    initialWord,
}) => {
    const [word, setWord] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DictionaryEntry | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [searched, setSearched] = useState(false);
    const [emptyWarning, setEmptyWarning] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const inputRef = useRef<TextInput>(null);

    // Reset state when sheet opens
    useEffect(() => {
        if (visible) {
            // If initialWord provided, use it; otherwise empty
            const wordToSearch = initialWord?.trim() || '';
            setWord(wordToSearch);
            setResult(null);
            setNotFound(false);
            setSearched(false);
            setLoading(false);
            setEmptyWarning(false);

            // Animate in
            Animated.spring(slideAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 65,
                friction: 10,
            }).start();

            // If we have an initial word, auto-search immediately
            if (wordToSearch.length >= 2) {
                // Delay to ensure animation has started
                setTimeout(() => {
                    performSearch(wordToSearch);
                }, 200);
            } else {
                // Focus input after animation
                setTimeout(() => inputRef.current?.focus(), 300);
            }
        } else {
            slideAnim.setValue(0);
        }
    }, [visible, slideAnim, initialWord]);

    const performSearch = useCallback(async (searchWord: string) => {
        const normalized = normalizeTurkishWord(searchWord);
        if (!normalized) return;

        setLoading(true);
        setResult(null);
        setNotFound(false);

        try {
            await dictionaryDb.init();
            const entry = await dictionaryDb.searchDefinition(normalized);

            if (entry) {
                setResult(entry);
                setNotFound(false);
            } else {
                setNotFound(true);
            }
        } catch (error) {
            console.error('[Lugat] Search error:', error);
            setNotFound(true);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    }, []);

    const handleSearch = useCallback(async () => {
        const normalized = normalizeTurkishWord(word);

        // Empty input guard - show warning, don't query DB
        if (!normalized) {
            setEmptyWarning(true);
            setTimeout(() => setEmptyWarning(false), 2000);
            return;
        }

        setEmptyWarning(false);
        Keyboard.dismiss();
        setLoading(true);
        setResult(null);
        setNotFound(false);

        if (__DEV__) {
            console.log(`[Lugat] Searching for: "${normalized}"`);;
        }

        try {
            await dictionaryDb.init();
            const entry = await dictionaryDb.searchDefinition(normalized);

            if (entry) {
                setResult(entry);
                setNotFound(false);
                if (__DEV__) {
                    console.log(`[Lugat] Found: ${entry.word_osm} - ${entry.definition?.substring(0, 50)}...`);
                }
            } else {
                setNotFound(true);
                if (__DEV__) {
                    console.log(`[Lugat] Not found: "${normalized}"`);
                }
            }
        } catch (error) {
            console.error('[Lugat] Search error:', error);
            setNotFound(true);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    }, [word]);

    const handleClose = useCallback(() => {
        Keyboard.dismiss();
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => onClose());
    }, [onClose, slideAnim]);

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [400, 0],
    });

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={handleClose}
                />
                <Animated.View
                    style={[
                        styles.sheet,
                        { transform: [{ translateY }] },
                    ]}
                >
                    {/* Handle bar */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>📖 Lügat</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Input */}
                    <View style={styles.inputRow}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            value={word}
                            onChangeText={setWord}
                            placeholder="Kelime girin..."
                            placeholderTextColor="#888"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="search"
                            onSubmitEditing={handleSearch}
                        />
                        <TouchableOpacity
                            style={[styles.searchBtn, !word.trim() && styles.searchBtnDisabled]}
                            onPress={handleSearch}
                            disabled={!word.trim() || loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.searchBtnText}>Ara</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Results */}
                    <ScrollView style={styles.resultContainer} keyboardShouldPersistTaps="handled">
                        {result && (
                            <View style={styles.resultCard}>
                                <Text style={styles.resultWord}>
                                    {result.word_osm}
                                    {result.word_tr && result.word_tr !== result.word_osm && (
                                        <Text style={styles.resultWordAlt}> ({result.word_tr})</Text>
                                    )}
                                </Text>
                                <Text style={styles.resultDefinition}>
                                    {result.definition || 'Tanım bulunamadı.'}
                                </Text>
                            </View>
                        )}

                        {notFound && searched && (
                            <View style={styles.notFoundContainer}>
                                <Text style={styles.notFoundIcon}>🔍</Text>
                                <Text style={styles.notFoundText}>
                                    "{normalizeTurkishWord(word)}" için kayıt bulunamadı.
                                </Text>
                            </View>
                        )}

                        {emptyWarning && (
                            <View style={styles.warningContainer}>
                                <Text style={styles.warningText}>⚠️ Kelime giriniz</Text>
                            </View>
                        )}

                        {!searched && !loading && !emptyWarning && (
                            <Text style={styles.hintText}>
                                Aramak istediğiniz kelimeyi yazıp "Ara" butonuna basın.
                            </Text>
                        )}
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        backgroundColor: '#1a1a2e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        minHeight: SCREEN_HEIGHT * 0.4,
        maxHeight: SCREEN_HEIGHT * 0.7,
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#444',
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeBtn: {
        padding: 8,
    },
    closeBtnText: {
        fontSize: 20,
        color: '#888',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    input: {
        flex: 1,
        backgroundColor: '#2a2a4a',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#3a3a5a',
    },
    searchBtn: {
        backgroundColor: '#4a6cf7',
        borderRadius: 10,
        paddingHorizontal: 20,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 70,
    },
    searchBtnDisabled: {
        backgroundColor: '#3a3a5a',
    },
    searchBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    resultContainer: {
        flex: 1,
    },
    resultCard: {
        backgroundColor: '#2a2a4a',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#4a6cf7',
    },
    resultWord: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    resultWordAlt: {
        fontSize: 16,
        fontWeight: 'normal',
        color: '#aaa',
    },
    resultDefinition: {
        fontSize: 16,
        color: '#ddd',
        lineHeight: 24,
    },
    notFoundContainer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    notFoundIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    notFoundText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
    },
    warningContainer: {
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        borderRadius: 8,
        marginVertical: 8,
    },
    warningText: {
        fontSize: 16,
        color: '#ffa500',
        fontWeight: '500',
    },
    hintText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        paddingVertical: 20,
    },
});
