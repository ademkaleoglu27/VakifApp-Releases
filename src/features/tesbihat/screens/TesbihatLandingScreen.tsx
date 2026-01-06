import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { PremiumHeader } from '@/components/PremiumHeader';
import { useNavigation } from '@react-navigation/native';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { TESBIHAT_DATA, TesbihatTime } from '../data/tesbihatData';
import { LinearGradient } from 'expo-linear-gradient';

export const TesbihatLandingScreen = () => {
    const navigation = useNavigation<any>();

    const renderItem = ({ item }: { item: TesbihatTime }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('TesbihatPlayer', { title: item.title, tracks: item.tracks, pdfSource: item.pdfSource })}
        >
            <LinearGradient
                colors={[item.color, changeColorLightness(item.color, -20)]}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.iconContainer}>
                    <Ionicons name="moon" size={32} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.trackCount}>{item.tracks.length} Parça</Text>

                <View style={styles.playIcon}>
                    <Ionicons name="play" size={20} color={item.color} />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader title="Tesbihatlar" backButton />
            <FlatList
                data={TESBIHAT_DATA}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                numColumns={2}
                columnWrapperStyle={{ gap: 16 }}
            />
        </View>
    );
};

// Helper to darken color slightly for gradient
const changeColorLightness = (color: string, amount: number) => {
    return color; // Simplification for now, or use a utility if available. 
    // LinearGradient handles hex codes well, but calculating darker hex manually is verbose without a lib.
    // We can just return the same color or a hardcoded variant in the data if needed.
    // For now, let's just assume the data has good colors or use a simple transparency overlay.
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    list: { padding: 16 },
    card: {
        flex: 1,
        height: 160,
        borderRadius: 24,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    cardGradient: {
        flex: 1,
        borderRadius: 24,
        padding: 16,
        justifyContent: 'space-between'
    },
    iconContainer: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center'
    },
    cardTitle: {
        fontSize: 18, fontWeight: 'bold', color: '#fff',
        marginTop: 12
    },
    trackCount: {
        fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600'
    },
    playIcon: {
        position: 'absolute',
        bottom: 16, right: 16,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        elevation: 4
    }
});
