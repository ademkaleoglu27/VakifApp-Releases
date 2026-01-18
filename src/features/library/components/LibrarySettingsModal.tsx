// LibrarySettingsModal.tsx - Library customization modal
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LibrarySettingsModalProps {
    visible: boolean;
    onClose: () => void;
}

export const LibrarySettingsModal: React.FC<LibrarySettingsModalProps> = ({
    visible,
    onClose
}) => {
    const [darkTheme, setDarkTheme] = React.useState(false);
    const [showRecent, setShowRecent] = React.useState(true);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Kütüphane Ayarları</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Settings List */}
                    <View style={styles.settingsList}>
                        {/* Theme setting (placeholder) */}
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="moon-outline" size={22} color="#1e293b" />
                                <Text style={styles.settingLabel}>Koyu Tema</Text>
                            </View>
                            <Switch
                                value={darkTheme}
                                onValueChange={setDarkTheme}
                                trackColor={{ false: '#e2e8f0', true: '#10b981' }}
                                thumbColor="#fff"
                                disabled
                            />
                        </View>

                        {/* Recent reads toggle */}
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="time-outline" size={22} color="#1e293b" />
                                <Text style={styles.settingLabel}>Son Okunanları Göster</Text>
                            </View>
                            <Switch
                                value={showRecent}
                                onValueChange={setShowRecent}
                                trackColor={{ false: '#e2e8f0', true: '#10b981' }}
                                thumbColor="#fff"
                                disabled
                            />
                        </View>

                        {/* Placeholder for future features */}
                        <View style={styles.futureSection}>
                            <Ionicons name="sparkles-outline" size={20} color="#94a3b8" />
                            <Text style={styles.futureText}>
                                Daha fazla özelleştirme yakında...
                            </Text>
                        </View>
                    </View>

                    {/* Close button */}
                    <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                        <Text style={styles.doneButtonText}>Tamam</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        maxHeight: '70%'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b'
    },
    closeButton: {
        padding: 4
    },
    settingsList: {
        padding: 20
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    settingLabel: {
        fontSize: 16,
        color: '#1e293b'
    },
    futureSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 12
    },
    futureText: {
        fontSize: 14,
        color: '#94a3b8',
        fontStyle: 'italic'
    },
    doneButton: {
        marginHorizontal: 20,
        backgroundColor: '#10b981',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    }
});
