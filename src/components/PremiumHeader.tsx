import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '@/config/theme';

interface PremiumHeaderProps {
    title: string;
    subtitle?: string;
    backButton?: boolean;
    onBackPress?: () => void;
    iconName?: keyof typeof Ionicons.glyphMap;
    actionIcon?: keyof typeof Ionicons.glyphMap;
    onAction?: () => void;
    children?: React.ReactNode;
}

export const PremiumHeader = ({ title, subtitle, backButton = false, onBackPress, iconName = "arrow-back", actionIcon, onAction, children }: PremiumHeaderProps) => {
    const navigation = useNavigation();

    return (
        <View style={styles.headerArea}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
            <View style={styles.topRow}>
                <View style={styles.leftContainer}>
                    {backButton && (
                        <TouchableOpacity onPress={onBackPress || (() => navigation.goBack())} style={styles.iconButton}>
                            <Ionicons name={iconName} size={24} color="#fff" />
                        </TouchableOpacity>
                    )}
                    <View style={[styles.titleContainer, backButton && { marginLeft: 8 }]}>
                        <Text style={styles.title}>{title}</Text>
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>
                </View>

                {actionIcon && (
                    <TouchableOpacity onPress={onAction} style={styles.iconButton}>
                        <Ionicons name={actionIcon} size={24} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Extended Content (e.g., Date Picker) */}
            {children && (
                <View style={styles.childrenContainer}>
                    {children}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    headerArea: {
        backgroundColor: theme.colors.primary,
        paddingTop: Platform.OS === 'android' ? 50 : 60,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
        zIndex: 10
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    titleContainer: {
        justifyContent: 'center'
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '500',
    },
    iconButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    childrenContainer: {
        marginTop: 16
    }
});
