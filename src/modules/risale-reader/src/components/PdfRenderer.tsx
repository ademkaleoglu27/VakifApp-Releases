import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Pdf from 'react-native-pdf';

interface PdfRendererProps {
    uri: string;
    page: number;
    onPageChanged: (page: number, numberOfPages: number) => void;
    onError: (error: any) => void;
}

export const PdfRenderer: React.FC<PdfRendererProps> = ({ uri, page, onPageChanged, onError }) => {
    return (
        <View style={styles.container}>
            <Pdf
                source={{ uri, cache: true }}
                page={page}
                onPageChanged={onPageChanged}
                onError={onError}
                onPressLink={(uri) => {
                    console.log(`Link pressed: ${uri}`);
                }}
                style={styles.pdf}
                enablePaging={true}
                horizontal={true} // Usually books are horizontal swipe
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    pdf: {
        flex: 1,
        width: '100%',
        height: '100%',
    }
});
