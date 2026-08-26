import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';

interface PageStepperProps {
    value: string;
    onChange: (value: string) => void;
    step?: number;
    min?: number;
    max?: number;
    label?: string;
}

export const PageStepper: React.FC<PageStepperProps> = ({
    value,
    onChange,
    step = 10,
    min = 0,
    max = 9999,
    label = 'Sayfa Sayısı'
}) => {
    const currentValue = parseInt(value) || 0;

    const increment = () => {
        const newValue = Math.min(currentValue + step, max);
        onChange(newValue.toString());
    };

    const decrement = () => {
        const newValue = Math.max(currentValue - step, min);
        onChange(newValue.toString());
    };

    const handleTextChange = (text: string) => {
        // Only allow numbers
        const numericValue = text.replace(/[^0-9]/g, '');
        onChange(numericValue);
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            <View style={styles.stepperRow}>
                {/* Decrement Button */}
                <TouchableOpacity
                    style={[styles.stepBtn, currentValue <= min && styles.stepBtnDisabled]}
                    onPress={decrement}
                    disabled={currentValue <= min}
                    activeOpacity={0.7}
                >
                    <Ionicons name="remove" size={28} color={currentValue <= min ? '#CBD5E1' : '#fff'} />
                </TouchableOpacity>

                {/* Input Field */}
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={handleTextChange}
                    keyboardType="number-pad"
                    textAlign="center"
                    selectTextOnFocus
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                    returnKeyType="done"
                    blurOnSubmit={false}
                    autoCorrect={false}
                    autoCapitalize="none"
                />

                {/* Increment Button */}
                <TouchableOpacity
                    style={[styles.stepBtn, styles.stepBtnPlus]}
                    onPress={increment}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Quick Buttons */}
            <View style={styles.quickButtonsRow}>
                {[5, 10, 20, 50].map((quickValue) => (
                    <TouchableOpacity
                        key={quickValue}
                        style={styles.quickBtn}
                        onPress={() => onChange((currentValue + quickValue).toString())}
                    >
                        <Text style={styles.quickBtnText}>+{quickValue}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        textAlign: 'center',
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    stepBtn: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    stepBtnPlus: {
        backgroundColor: theme.colors.primary,
    },
    stepBtnDisabled: {
        backgroundColor: '#E2E8F0',
    },
    input: {
        width: 120,
        height: 64,
        backgroundColor: '#fff',
        borderRadius: 16,
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.primary,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
    },
    quickButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
    },
    quickBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    quickBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
});
