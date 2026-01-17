import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, DevSettings, NativeModules, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/config/theme';

export const DeveloperToolsScreen = () => {
    const navigation = useNavigation<any>();

    const openDevMenu = () => {
        try {
            const safeDevSettings = DevSettings as any;
            if (safeDevSettings.show) {
                safeDevSettings.show();
            } else if (NativeModules.DevMenu && NativeModules.DevMenu.show) {
                NativeModules.DevMenu.show();
            } else {
                Alert.alert(
                    "Dev Menu",
                    "Dev Settings API is not available.\n\nShake device or press Cmd+M (iOS) / Cmd+M (Android Emulator) to open."
                );
            }
        } catch (e) {
            Alert.alert("Error", "Could not open Dev Menu");
        }
    };

    const clearCaches = async () => {
        Alert.alert(
            "Clear Caches",
            "Are you sure you want to clear all AsyncStorage data? This will reset all app preferences and progress.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear & Restart",
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.clear();
                            Alert.alert("Success", "Cache cleared. Please restart the app manually if it doesn't reload.");
                            // Attempt reload if possible, otherwise just alert
                            if (DevSettings && DevSettings.reload) {
                                DevSettings.reload();
                            } else if (NativeModules.DevSettings && NativeModules.DevSettings.reload) {
                                NativeModules.DevSettings.reload();
                            }
                        } catch (e) {
                            Alert.alert("Error", "Failed to clear cache");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#334155" />
                </TouchableOpacity>
                <Text style={styles.title}>Developer Tools</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General</Text>

                    <DebugButton
                        label="Open Dev Menu"
                        icon="code-slash-outline"
                        onPress={openDevMenu}
                        color={theme.colors.primary}
                    />

                    <DebugButton
                        label="Content Health Debug"
                        icon="pulse-outline"
                        onPress={() => navigation.navigate('ContentHealthDebug')}
                        color="#0891b2"
                    />

                    <DebugButton
                        label="Generate Integrity Report"
                        icon="document-text-outline"
                        onPress={() => navigation.navigate('ContentIntegrity', { errorCode: 'MANUAL_CHECK' })}
                        color="#0891b2"
                    />

                    <DebugButton
                        label="HTML Reader Pilot (Sözler 1-8)"
                        icon="logo-html5"
                        onPress={() => navigation.navigate('RisaleHtmlReaderHome')}
                        color="#eab308"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Danger Zone</Text>

                    <DebugButton
                        label="Clear All Caches"
                        icon="trash-outline"
                        onPress={clearCaches}
                        color="#ef4444"
                        isDestructive
                    />
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>Environment: __DEV__ = {String(__DEV__)}</Text>
                    <Text style={styles.infoText}>OS: {Platform.OS} v{String(Platform.Version)}</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const DebugButton = ({ label, icon, onPress, color, isDestructive }: any) => (
    <TouchableOpacity
        style={[styles.button, isDestructive && styles.destructiveButton]}
        onPress={onPress}
        activeOpacity={0.8}
    >
        <Ionicons name={icon} size={24} color={isDestructive ? '#ef4444' : color} />
        <Text style={[styles.buttonLabel, isDestructive && { color: '#ef4444' }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    content: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    destructiveButton: {
        borderColor: '#fee2e2',
        backgroundColor: '#fef2f2',
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#334155',
        marginLeft: 12,
    },
    infoBox: {
        padding: 16,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        marginTop: 20,
    },
    infoText: {
        fontSize: 12,
        color: '#64748b',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginBottom: 4,
    }
});
