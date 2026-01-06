import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Work } from '@/services/risale/schema';
import { getWorks, initRisaleDB } from '@/services/risale/database';
import { getBookCover } from '@/config/books';
import { FontFamily } from '@/config/fonts';

export const RisaleHomeScreen = () => {
    const [works, setWorks] = useState<Work[]>([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation<any>();

    useEffect(() => {
        const load = async () => {
            try {
                await initRisaleDB();
                const items = await getWorks();
                setWorks(items);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Külliyat Hazırlanıyor...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={works}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => navigation.navigate('RisalePdfReader', { bookId: item.id, title: item.title })}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={getBookCover(item.id)}
                            style={styles.coverImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDF6E3', // Cream paper background
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FDF6E3',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontFamily: FontFamily.Body,
    },
    listContent: {
        padding: 12,
    },
    row: {
        justifyContent: 'space-between',
    },
    card: {
        backgroundColor: '#FFFEF8',
        width: '48%',
        marginBottom: 16,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    coverImage: {
        width: 80,
        height: 100,
        marginBottom: 10,
        borderRadius: 6,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F1F1F',
        fontFamily: FontFamily.Body, // More readable for list items
        textAlign: 'center',
    },
});
