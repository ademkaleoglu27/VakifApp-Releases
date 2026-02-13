// ShelfRow.tsx - Horizontal scrollable shelf of books
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { BookCard } from './BookCard';
import { Shelf, LibraryItem } from '../catalog/LibraryCatalog';

interface ShelfRowProps {
    shelf: Shelf;
    onBookPress: (item: LibraryItem) => void;
}

export const ShelfRow = React.memo(({ shelf, onBookPress }: ShelfRowProps) => {
    const isHero = shelf.style === 'hero';

    if (shelf.items.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Shelf title */}
            {shelf.title ? (
                <Text style={styles.title}>{shelf.title}</Text>
            ) : null}

            {/* Books row */}
            <FlatList
                data={shelf.items}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <BookCard
                        item={item}
                        size={isHero ? 'large' : 'medium'}
                        onPress={onBookPress}
                    />
                )}
                // Performance
                initialNumToRender={4}
                maxToRenderPerBatch={6}
                windowSize={5}
                removeClippedSubviews={true}
            />

            {/* Shelf decoration line */}
            <View style={styles.shelfLine} />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 24
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 12,
        marginLeft: 16,
        letterSpacing: -0.3
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 8
    },
    shelfLine: {
        height: 3,
        backgroundColor: '#e2dad0',
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 2,
        // Wood texture effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    }
});
