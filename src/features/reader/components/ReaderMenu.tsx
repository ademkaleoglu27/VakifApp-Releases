import React, { forwardRef, useImperativeHandle, useState, memo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ReaderMenuRef {
    open: () => void;
    close: () => void;
    setLugatEnabled: (enabled: boolean) => void;
}

interface Props {
    // lugatEnabled removed from props to avoid re-render loop
    onToggleLugat: () => void;
}

export const ReaderMenu = memo(forwardRef<ReaderMenuRef, Props>(({ onToggleLugat }, ref) => {
    const [visible, setVisible] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);

    useImperativeHandle(ref, () => ({
        open: () => {
            // Defer to next frame to allow touch feedback to finish
            requestAnimationFrame(() => setVisible(true));
        },
        close: () => setVisible(false),
        setLugatEnabled: (val: boolean) => setIsEnabled(val)
    }));

    const handleToggleLugat = () => {
        // Close menu first, then toggle state to avoid double render heavy hit
        setVisible(false);
        // Optimistic update
        setIsEnabled(prev => !prev);
        // Direct call - InteractionManager can hang with FlashList
        setTimeout(() => {
            onToggleLugat();
        }, 0);
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={() => setVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.menuContainer}>
                            {/* Menu Header */}
                            <Text style={styles.menuTitle}>Seçenekler</Text>
                            <View style={styles.divider} />

                            {/* Lugat Toggle */}
                            <TouchableOpacity style={styles.menuItem} onPress={handleToggleLugat}>
                                <View style={[styles.iconBox, { backgroundColor: isEnabled ? '#E3F2FD' : '#F5F5F5' }]}>
                                    <Ionicons
                                        name={isEnabled ? "book" : "book-outline"}
                                        size={20}
                                        color={isEnabled ? "#2196F3" : "#757575"}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.itemTitle}>Lugat Modu</Text>
                                    <Text style={styles.itemSub}>{isEnabled ? "Açık (Kelimelere tıklanabilir)" : "Kapalı (Sadece okuma)"}</Text>
                                </View>
                                <Ionicons
                                    name={isEnabled ? "toggle" : "toggle-outline"}
                                    size={28}
                                    color={isEnabled ? "#2196F3" : "#BDBDBD"}
                                />
                            </TouchableOpacity>

                            {/* Placeholders */}
                            <TouchableOpacity style={[styles.menuItem, styles.disabled]} disabled>
                                <View style={styles.iconBox}>
                                    <Ionicons name="bookmark-outline" size={20} color="#BDBDBD" />
                                </View>
                                <Text style={[styles.itemTitle, { color: '#BDBDBD', marginLeft: 12 }]}>Yer İmi Ekle</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.menuItem, styles.disabled]} disabled>
                                <View style={styles.iconBox}>
                                    <Ionicons name="share-social-outline" size={20} color="#BDBDBD" />
                                </View>
                                <Text style={[styles.itemTitle, { color: '#BDBDBD', marginLeft: 12 }]}>Paylaş</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.menuItem, styles.disabled]} disabled>
                                <View style={styles.iconBox}>
                                    <Ionicons name="color-palette-outline" size={20} color="#BDBDBD" />
                                </View>
                                <Text style={[styles.itemTitle, { color: '#BDBDBD', marginLeft: 12 }]}>Tema</Text>
                            </TouchableOpacity>

                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}));

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 60, // Header height approx
        paddingRight: 10,
    },
    menuContainer: {
        width: 250,
        backgroundColor: 'white',
        borderRadius: 12,
        paddingVertical: 8,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#424242',
        marginLeft: 16,
        marginVertical: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#EEEEEE',
        marginBottom: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5'
    },
    itemTitle: {
        fontSize: 14,
        color: '#212121',
        fontWeight: '500',
    },
    itemSub: {
        fontSize: 10,
        color: '#757575',
        marginTop: 2,
    },
    disabled: {
        opacity: 0.7
    }
});
