import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PoetryLine {
    text: string;
    sideText?: string;
    bold?: boolean;
    textAlign?: 'left' | 'center' | 'right';
}

interface Props {
    lines: PoetryLine[];
    fontSize: number;
    color?: string;
}

export const PoetryBlock = memo(({ lines, fontSize, color = '#2C3E50' }: Props) => {
    return (
        <View style={styles.container}>
            {lines.map((line, index) => (
                <View key={index} style={styles.lineWrapper}>
                    {/* Main Verse */}
                    <Text style={[
                        styles.verseText,
                        {
                            fontSize: fontSize * 1.1,
                            color,
                            textAlign: line.textAlign || 'center',
                            fontFamily: line.bold ? 'CrimsonPro_700Bold_Italic' : 'CrimsonPro_400Regular_Italic',
                            opacity: line.bold ? 1 : 0.9
                        }
                    ]}>
                        {line.text}
                    </Text>

                    {/* Side Text */}
                    {line.sideText && (
                        <Text style={[
                            styles.sideText,
                            { fontSize: fontSize * 0.9, color }
                        ]}>
                            {line.sideText}
                        </Text>
                    )}
                </View>
            ))}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        paddingHorizontal: 10,
    },
    lineWrapper: {
        flexDirection: 'column',
        marginBottom: 12,
        width: '100%',
    },
    verseText: {
        width: '100%',
    },
    sideText: {
        fontFamily: 'CrimsonPro_400Regular_Italic',
        textAlign: 'right',
        marginTop: 4,
        alignSelf: 'flex-end',
        opacity: 0.85,
    }
});
