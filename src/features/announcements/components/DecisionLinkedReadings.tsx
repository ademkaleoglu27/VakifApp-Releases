import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { RisaleUserDb, RisaleDecisionLink } from '@/services/risaleUserDb';
import { RISALE_BOOKS } from '@/config/risaleSources';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';

export const DecisionLinkedReadings = ({ decisionId }: { decisionId: string }) => {
    const navigation = useNavigation<any>();
    const [links, setLinks] = useState<RisaleDecisionLink[]>([]);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [selectedBookId, setSelectedBookId] = useState(RISALE_BOOKS[0].id);
    const [pageNumber, setPageNumber] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        loadLinks();
    }, [decisionId]);

    const loadLinks = async () => {
        const data = await RisaleUserDb.getDecisionLinks(decisionId);
        setLinks(data);
    };

    const handleAddLink = async () => {
        if (!pageNumber) {
            Alert.alert('Hata', 'Lütfen sayfa numarası giriniz.');
            return;
        }
        await RisaleUserDb.addDecisionLink(decisionId, selectedBookId, parseInt(pageNumber), note);
        setModalVisible(false);
        setPageNumber('');
        setNote('');
        loadLinks();
    };

    const handlePressLink = (item: RisaleDecisionLink) => {
        const uri = `${FileSystem.documentDirectory}risale/${item.book_id}.pdf`;
        const book = RISALE_BOOKS.find(b => b.id === item.book_id);

        navigation.navigate('RisalePdfReader', {
            bookId: item.book_id,
            title: book?.title || item.book_id,
            uri: uri,
            initialPage: item.page_number
        });
    };

    const getBookTitle = (id: string) => RISALE_BOOKS.find(b => b.id === id)?.title || id;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>İlgili Okumalar</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addButtonText}>Ekle</Text>
                </TouchableOpacity>
            </View>

            {links.length === 0 ? (
                <Text style={styles.emptyText}>Henüz ekli bir okuma yok.</Text>
            ) : (
                links.map(link => (
                    <TouchableOpacity key={link.id} style={styles.linkCard} onPress={() => handlePressLink(link)}>
                        <Ionicons name="book-outline" size={20} color={theme.colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.linkTitle}>{getBookTitle(link.book_id)} - Sayfa {link.page_number}</Text>
                            {link.note && <Text style={styles.linkNote}>{link.note}</Text>}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </TouchableOpacity>
                ))
            )}

            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Okuma Kaydı Ekle</Text>

                        <Text style={styles.label}>Kitap Seçin:</Text>
                        <View style={styles.bookSelector}>
                            {RISALE_BOOKS.slice(0, 5).map(book => (
                                <TouchableOpacity
                                    key={book.id}
                                    style={[styles.bookOption, selectedBookId === book.id && styles.bookOptionSelected]}
                                    onPress={() => setSelectedBookId(book.id)}
                                >
                                    <Text style={[styles.bookOptionText, selectedBookId === book.id && { color: '#fff' }]}>
                                        {book.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Sayfa:</Text>
                        <TextInput
                            style={styles.input}
                            value={pageNumber}
                            onChangeText={setPageNumber}
                            keyboardType="numeric"
                            placeholder="Örn: 124"
                        />

                        <Text style={styles.label}>Not (Opsiyonel):</Text>
                        <TextInput
                            style={styles.input}
                            value={note}
                            onChangeText={setNote}
                            placeholder="Kısa bir açıklama..."
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                                <Text>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddLink} style={styles.saveButton}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Ekle</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        gap: 4
    },
    addButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold'
    },
    emptyText: {
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic'
    },
    linkCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    linkTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333'
    },
    linkNote: {
        fontSize: 12,
        color: '#666'
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center'
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 8
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 10,
        fontSize: 16
    },
    bookSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    bookOption: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: '#E5E7EB'
    },
    bookOptionSelected: {
        backgroundColor: theme.colors.primary
    },
    bookOptionText: {
        fontSize: 12,
        color: '#333'
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20
    },
    cancelButton: {
        padding: 10
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8
    }
});
