import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Section } from '@/services/risale/schema';
import { getSections } from '@/services/risale/database';

type RouteParams = {
    RisaleSectionList: {
        workId: string;
        workTitle: string;
    };
};

export const WorkDetailScreen = () => {
    const route = useRoute<RouteProp<RouteParams, 'RisaleSectionList'>>();
    const navigation = useNavigation<any>();
    const { workId, workTitle } = route.params;

    const [sections, setSections] = useState<Section[]>([]);

    useEffect(() => {
        navigation.setOptions({ title: workTitle });
        getSections(workId).then(setSections).catch(console.error);
    }, [workId, workTitle, navigation]);

    return (
        <View style={styles.container}>
            <FlatList
                data={sections}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => navigation.navigate('RisaleReader', { bookId: workId, title: item.title })}
                    >
                        <View style={styles.numBadge}>
                            <Text style={styles.numText}>{item.order_index}</Text>
                        </View>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    numBadge: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    numText: {
        color: '#666',
        fontWeight: 'bold',
        fontSize: 12
    },
    itemTitle: {
        fontSize: 16,
        color: '#333',
        flex: 1,
        fontFamily: 'serif'
    }
});
