import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { theme } from '@/config/theme';

interface LugatModalProps {
    visible: boolean;
    word: string | null;
    definitions: any[] | null;
    onClose: () => void;
}

const { height } = Dimensions.get('window');

export const LugatModal: React.FC<LugatModalProps> = ({ visible, word, definitions, onClose }) => {
    const slideAnim = useRef(new Animated.Value(height)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 5
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: height,
                duration: 250,
                useNativeDriver: true
            }).start();
        }
    }, [visible]);

    const handleCopy = async () => {
        if (definitions && definitions.length > 0) {
            const textToCopy = `${word}: ${definitions.map(d => d.meaning).join('\n')}`;
            await Clipboard.setStringAsync(textToCopy);
        }
    };

    if (!visible && !word) return null;

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={onClose}
            animationType="fade"
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} />

                <Animated.View
                    style={[
                        styles.sheet,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Text style={styles.word}>{word}</Text>
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={handleCopy} style={styles.actionButton}>
                                <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose} style={styles.actionButton}>
                                <Ionicons name="close-circle-outline" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.content}>
                        {definitions && definitions.length > 0 ? (
                            definitions.map((def, idx) => (
                                <View key={idx} style={styles.defContainer}>
                                    <Text style={styles.meaning}>{def.meaning}</Text>
                                    {def.source && <Text style={styles.source}>Kaynak: {def.source}</Text>}
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>Bu kelime için kayıt bulunamadı.</Text>
                        )}
                        {/* Spacer */}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '40%',
        padding: 16,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#ddd',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 8
    },
    word: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif'
    },
    actions: {
        flexDirection: 'row',
        gap: 16
    },
    actionButton: {
        padding: 4
    },
    content: {
        flex: 1
    },
    defContainer: {
        marginBottom: 16,
        backgroundColor: '#f9fafb',
        padding: 12,
        borderRadius: 8
    },
    meaning: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24
    },
    source: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
        fontStyle: 'italic'
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20
    }
});
