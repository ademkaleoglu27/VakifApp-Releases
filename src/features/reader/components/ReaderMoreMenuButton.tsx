import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback, InteractionManager, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
    // Controlled component - value comes from parent
    lugatEnabled: boolean;
    onLugatToggle: (isEnabled: boolean) => void;
    onRestartBook?: () => void;
}

export const ReaderMoreMenuButton = React.memo(({ lugatEnabled, onLugatToggle, onRestartBook }: Props) => {
    const [visible, setVisible] = useState(false);

    const handleOpen = useCallback(() => {
        // Defer opening to avoid scroll/touch conflicts
        requestAnimationFrame(() => {
            setVisible(true);
        });
    }, []);

    const handleClose = useCallback(() => {
        setVisible(false);
    }, []);

    const handleToggle = useCallback(() => {
        // 1. Close Menu Immediately
        setVisible(false);

        // 2. Perform Logic after interaction complete
        InteractionManager.runAfterInteractions(() => {
            onLugatToggle(!lugatEnabled);
        });
    }, [lugatEnabled, onLugatToggle]);

    const handleRestart = useCallback(() => {
        setVisible(false);
        InteractionManager.runAfterInteractions(() => {
            onRestartBook?.();
        });
    }, [onRestartBook]);

    return (
        <>
            {/* The Button (Always Visible) */}
            <TouchableOpacity
                onPress={handleOpen}
                style={styles.button}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
            </TouchableOpacity>

            {/* The Lightweight Modal (Only rendered when visible? No, rendered but hidden/shown via Modal prop) */}
            <Modal
                transparent
                visible={visible}
                animationType="fade"
                onRequestClose={handleClose}
                statusBarTranslucent
            >
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.menuContainer, styles.shadow]}>
                                {/* Header */}
                                <Text style={styles.headerTitle}>Seçenekler</Text>
                                <View style={styles.divider} />

                                {/* Lugat Toggle Item */}
                                <TouchableOpacity style={styles.menuItem} onPress={handleToggle}>
                                    <View style={[styles.iconBox, { backgroundColor: lugatEnabled ? '#E3F2FD' : '#FAFAFA' }]}>
                                        <Ionicons
                                            name={lugatEnabled ? "book" : "book-outline"}
                                            size={20}
                                            color={lugatEnabled ? "#2196F3" : "#757575"}
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.itemTitle}>Lugat Modu</Text>
                                        <Text style={styles.itemSub}>
                                            {lugatEnabled ? "Açık" : "Kapalı"}
                                        </Text>
                                    </View>
                                    <View style={[styles.toggleBadge, { backgroundColor: lugatEnabled ? '#4CAF50' : '#E0E0E0' }]}>
                                        <Text style={{ fontSize: 10, color: lugatEnabled ? 'white' : '#757575', fontWeight: 'bold' }}>
                                            {lugatEnabled ? "ON" : "OFF"}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Yeniden Başla (Restart Book) */}
                                {onRestartBook && (
                                    <TouchableOpacity style={styles.menuItem} onPress={handleRestart}>
                                        <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                                            <Ionicons name="refresh" size={20} color="#D97706" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.itemTitle}>Yeniden Başla</Text>
                                            <Text style={styles.itemSub}>Bu kitabı baştan oku</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {/* Future Placeholders (Disabled) */}
                                <View style={{ opacity: 0.5 }}>
                                    <View style={styles.menuItem}>
                                        <View style={styles.iconBox}><Ionicons name="share-social-outline" size={20} color="#999" /></View>
                                        <Text style={[styles.itemTitle, { marginLeft: 12, color: '#999' }]}>Paylaş</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
});

const styles = StyleSheet.create({
    button: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)', // Lightweight dim
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: Platform.OS === 'ios' ? 60 : 50, // Approx header height
        paddingRight: 10,
    },
    menuContainer: {
        width: 220,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 8,
        backfaceVisibility: 'hidden', // Optimize render
    },
    shadow: {
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    headerTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        marginLeft: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginBottom: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAFAFA'
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    itemSub: {
        fontSize: 11,
        color: '#888',
    },
    toggleBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    }
});
