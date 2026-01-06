import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { ReaderTheme } from '../../constants/theme';

interface FootnotePanelProps {
    isVisible: boolean;
    content: string | null;
    onClose: () => void;
}

export const FootnotePanel: React.FC<FootnotePanelProps> = memo(({ isVisible, content, onClose }) => {
    if (!isVisible) return null;

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.sheet}>
                            <View style={styles.handle} />
                            <Text style={styles.title}>Haşiye</Text>
                            <Text style={styles.content}>{content}</Text>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: ReaderTheme.colors.background, // Match theme
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 20,
        minHeight: 200,
        paddingBottom: 40,
        // Shadow for elevation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: ReaderTheme.colors.separator,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: ReaderTheme.typography.sizes.footnote,
        color: ReaderTheme.colors.footnote,
        fontWeight: 'bold',
        marginBottom: 10,
        fontFamily: ReaderTheme.typography.bodyFont,
    },
    content: {
        fontSize: ReaderTheme.typography.sizes.body, // Slightly smaller than body? Prompt says "Küçük punto"
        // Let's adjust to be readable but distinct.
        // Prompt: "Küçük punto" -> Sizes.footnote is 14. 
        fontSize: ReaderTheme.typography.sizes.footnote,
        color: ReaderTheme.colors.text,
        lineHeight: ReaderTheme.typography.lineHeights.body, // Keep nice spacing
        fontFamily: ReaderTheme.typography.bodyFont,
    }
});
