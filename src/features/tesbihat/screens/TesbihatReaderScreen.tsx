import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/config/theme';
import { tesbihatTextData, TesbihatPage } from '../data/tesbihatTextData';

const FONT_SIZE_KEY = 'tesbihat_font_size';

export const TesbihatReaderScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { title } = route.params || { title: 'Tesbihat' };

    const [fontSize, setFontSize] = useState(20);

    useEffect(() => {
        navigation.setOptions({ title: title });
        AsyncStorage.getItem(FONT_SIZE_KEY).then(val => {
            if (val) setFontSize(parseInt(val, 10));
        });
    }, []);

    const increaseFont = () => {
        const newSize = Math.min(fontSize + 2, 32);
        setFontSize(newSize);
        AsyncStorage.setItem(FONT_SIZE_KEY, newSize.toString());
    };

    const decreaseFont = () => {
        const newSize = Math.max(fontSize - 2, 14);
        setFontSize(newSize);
        AsyncStorage.setItem(FONT_SIZE_KEY, newSize.toString());
    };

    const renderItem = ({ item }: { item: TesbihatPage }) => (
        <View style={styles.chunkContainer}>
            <Text style={[styles.text, { fontSize, lineHeight: fontSize * 1.6 }]}>
                {item.text}
            </Text>
            <View style={styles.separator} />
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Toolbar */}
            <View style={styles.toolbar}>
                <TouchableOpacity onPress={decreaseFont} style={styles.toolBtn}>
                    <Text style={styles.toolText}>A-</Text>
                </TouchableOpacity>
                <Text style={styles.toolLabel}>Boyut</Text>
                <TouchableOpacity onPress={increaseFont} style={styles.toolBtn}>
                    <Text style={styles.toolText}>A+</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={tesbihatTextData}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fffbeb', // Risale Cream Background
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    chunkContainer: {
        marginBottom: 24,
    },
    text: {
        color: '#1f2937', // Dark Gray Text
        fontFamily: 'System', // Or specific font if available
        textAlign: 'justify'
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginTop: 24,
        width: '80%',
        alignSelf: 'center'
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2
    },
    toolBtn: {
        width: 40, height: 40,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        marginHorizontal: 12,
        alignItems: 'center', justifyContent: 'center'
    },
    toolText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary
    },
    toolLabel: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500'
    }
});
