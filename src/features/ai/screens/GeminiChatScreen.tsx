
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, Alert, ScrollView } from 'react-native';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'model';
    timestamp: Date;
}

const QUICK_QUESTIONS = [
    "Bismillah'ın Sırrı",
    "Namazın Hakikati",
    "İman ve Amel",
    "Uhuvvet (Kardeşlik)",
    "Haşir (Diriliş)",
    "Hastalık Risalesi"
];

// Helper to format text with Chips (Sources) and Dictionary styling
const FormattedText = ({ text }: { text: string }) => {
    if (!text) return null; // Safety check

    // 1. Split by "KÜÇÜK LUGAT" to style it differently
    const parts = text.split('KÜÇÜK LUGAT (Referans):');
    const mainContent = parts[0];
    const dictionaryContent = parts.length > 1 ? parts[1] : null;

    // 2. Render Main Content with Source Chips
    // Regex to find [Kaynak: ...]
    const renderMain = (content: string) => {
        if (!content) return null;
        const regex = /(\[Kaynak:.*?\])/g;
        const segments = content.split(regex);

        return segments.map((segment, index) => {
            if (segment.match(regex)) {
                return (
                    <View key={index} style={styles.sourceChip}>
                        <Ionicons name="book-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.sourceText}>{segment.replace('[', '').replace(']', '')}</Text>
                    </View>
                );
            }
            return <Text key={index} style={styles.messageText}>{segment}</Text>;
        });
    };

    return (
        <View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                {renderMain(mainContent)}
            </View>

            {dictionaryContent && (
                <View style={styles.dictionaryContainer}>
                    <Text style={styles.dictionaryTitle}>📖 Küçük Bir Lugat</Text>
                    <Text style={styles.dictionaryText}>{dictionaryContent.trim()}</Text>
                </View>
            )}
        </View>
    );
};

export const GeminiChatScreen = () => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { initialQuery } = route.params || {};

    // Generate safer unique IDs
    const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Auto-send if initialQuery exists
    useEffect(() => {
        if (initialQuery) {
            setPrompt(initialQuery);
            setTimeout(() => {
                handleAutoSend(initialQuery);
            }, 500);
        }
    }, [initialQuery]);

    const handleAutoSend = async (text: string) => {
        if (!text.trim()) return;
        setLoading(true);

        const userMessage: Message = {
            id: generateId(),
            text: text,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setPrompt('');

        await sendToGemini(text, messages);
    };

    const sendToGemini = async (currentPrompt: string, previousMessages: Message[]) => {
        const supabase = getSupabaseClient();
        if (!supabase) {
            Alert.alert('Hata', 'Supabase bağlantısı kurulamadı.');
            setLoading(false);
            return;
        }

        try {
            const history = previousMessages.map(msg => ({
                role: msg.sender,
                parts: [{ text: msg.text }]
            }));

            const { data, error } = await supabase.functions.invoke('gemini-chat', {
                body: { prompt: currentPrompt, history },
            });

            if (error) throw new Error(error.message || 'Edge Function Error');
            if (!data || !data.text) throw new Error('Empty response from AI');

            const modelMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data.text,
                sender: 'model',
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, modelMessage]);
        } catch (error: any) {
            console.error('Gemini Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: `Hata: ${error.message || 'Bilinmeyen bir sorun oluştu.'}`,
                sender: 'model',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = () => {
        handleAutoSend(prompt);
    };

    useEffect(() => {
        if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    const renderItem = ({ item }: { item: Message }) => (
        <View style={[
            styles.messageContainer,
            item.sender === 'user' ? styles.userMessage : styles.modelMessage
        ]}>
            {item.sender === 'user' ? (
                <Text style={[styles.messageText, styles.userMessageText]}>{item.text}</Text>
            ) : (
                <FormattedText text={item.text} />
            )}

            {/* Timestamp */}
            <Text style={[
                styles.timestamp,
                item.sender === 'user' ? { color: '#cbd5e1', textAlign: 'right' } : { color: '#94a3b8', textAlign: 'left' }
            ]}>
                {item.id === '0' ? '' : item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#57534e" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="book-outline" size={18} color="#b45309" />
                        <Text style={styles.headerTitle}>Nuri Abi</Text>
                        <Ionicons name="book-outline" size={18} color="#b45309" style={{ transform: [{ scaleX: -1 }] }} />
                    </View>
                    <Text style={styles.headerSubtitle}>Risale-i Nur Asistanı</Text>
                </View>
                {/* Visual Placeholder for Menu or Settings */}
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.chatContainer}
            />

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#d97706" />
                    <Text style={styles.loadingText}>Risaleleri tarıyor...</Text>
                </View>
            )}

            <View style={styles.footerContainer}>
                {/* Quick Access Buttons */}
                {!loading && messages.length < 2 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAccessContainer}>
                        {QUICK_QUESTIONS.map((q, index) => (
                            <TouchableOpacity key={index} style={styles.quickButton} onPress={() => handleAutoSend(q)}>
                                <Text style={styles.quickButtonText}>{q}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.inputWrapper}
                >
                    <TextInput
                        style={styles.input}
                        value={prompt}
                        onChangeText={setPrompt}
                        placeholder="Bir soru sor (örn: Uhuvvet nedir?)"
                        placeholderTextColor="#a8a29e"
                        multiline
                    />
                    <TouchableOpacity
                        onPress={() => sendMessage()}
                        style={[styles.sendButton, { opacity: !prompt.trim() ? 0.6 : 1 }]}
                        disabled={!prompt.trim() || loading}
                    >
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFBF7', // Fildişi (Ivory)
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? 45 : 16, // Extra padding for camera notch
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: '#F5F4EF', // Slightly darker warm beige
        borderBottomWidth: 1,
        borderBottomColor: '#E7E5E4',
        shadowColor: "#d97706", // Amber shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#44403c', // Warm dark grey
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#b45309', // Amber 700 (Gold-like)
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Georgia-Italic' : 'serif',
        fontStyle: 'italic',
        marginTop: 2,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f4',
    },
    chatContainer: {
        padding: 16,
        paddingBottom: 24,
    },
    messageContainer: {
        maxWidth: '88%',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#57534e', // Warm Dark Grey
        borderBottomRightRadius: 4,
    },
    modelMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#ffffff',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        color: '#44403c', // Warm Grey Text
    },
    userMessageText: {
        color: '#fafaf9', // Off-white text for user
    },
    timestamp: {
        fontSize: 10,
        marginTop: 6,
        fontStyle: 'italic',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginLeft: 16,
        marginBottom: 8,
    },
    loadingText: {
        marginLeft: 8,
        color: '#78716c',
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    footerContainer: {
        backgroundColor: '#FDFBF7',
        borderTopWidth: 1,
        borderTopColor: '#e7e5e4',
    },
    quickAccessContainer: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexGrow: 0,
    },
    quickButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#d6d3d1',
        elevation: 1,
    },
    quickButtonText: {
        color: '#57534e',
        fontSize: 13,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingTop: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 12,
        maxHeight: 120,
        marginRight: 10,
        color: '#292524',
        fontSize: 16,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        borderWidth: 1,
        borderColor: '#e7e5e4',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#d97706', // Amber 600
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: "#d97706",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    // Phase 3 Styles
    sourceChip: {
        backgroundColor: '#15803d', // Green 700
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6,
        marginVertical: 2,
    },
    sourceText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    dictionaryContainer: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    dictionaryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#15803d', // Green 700 matching chips
        marginBottom: 6,
    },
    dictionaryText: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#4b5563',
        lineHeight: 22,
        backgroundColor: '#f0fdf4', // Very light green bg
        padding: 12,
        borderRadius: 8,
    }
});
