import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ReaderProps, ManifestData, ReaderLocation } from '../api/types';
import { ManifestParser } from '../engine/ManifestParser';
import { PdfRenderer } from './PdfRenderer';
import { SegmentRenderer } from './SegmentRenderer';
import { ReaderHeader } from './ui/ReaderHeader';
import { FootnotePanel } from './ui/FootnotePanel';
import { LugatBottomSheet } from './ui/LugatBottomSheet';
import * as FileSystem from 'expo-file-system';

export const RisaleReader: React.FC<ReaderProps> = (props) => {
    const { manifestUri, initialLocation, config, onLocationChange, onError } = props;

    const [manifest, setManifest] = useState<ManifestData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentLocation, setCurrentLocation] = useState<ReaderLocation | undefined>(initialLocation);
    const [jsonContent, setJsonContent] = useState<any>(null); // For text mode
    const [activeFormat, setActiveFormat] = useState<'pdf' | 'json'>(config?.preferredFormat || 'pdf');
    const [activeFootnoteContent, setActiveFootnoteContent] = useState<string | null>(null);
    const [currentSection, setCurrentSection] = useState<string>("");

    // Lugat (dictionary) lookup state
    const [lugatVisible, setLugatVisible] = useState(false);

    // Derived state for hooks need to be calculated efficiently or accessed safely
    // effectively "book" and "formats" logic needs to be safe even if manifest is null
    const book = (manifest && currentLocation) ? manifest.books[currentLocation.bookId] : null;
    const jsonFormat = book?.formats?.json;
    const manifestDir = manifestUri.substring(0, manifestUri.lastIndexOf('/'));

    const handleFootnotePress = useCallback((id: string) => {
        if (jsonContent && jsonContent.footnotes && jsonContent.footnotes[id]) {
            setActiveFootnoteContent(jsonContent.footnotes[id]);
        } else {
            console.warn("Footnote content not found for id:", id);
        }
    }, [jsonContent]);

    // Lugat lookup handler - triggered by long-press on segments
    const handleLugatLookup = useCallback(() => {
        if (__DEV__) {
            console.log('[RisaleReader] Opening Lugat BottomSheet');
        }
        setLugatVisible(true);
    }, []);

    // Hook 1: Load Manifest
    useEffect(() => {
        loadManifest();
    }, [manifestUri]);

    const loadManifest = async () => {
        try {
            setLoading(true);
            const data = await ManifestParser.load(manifestUri);
            setManifest(data);
            setLoading(false);
        } catch (err: any) {
            setError(err.message || 'Manifest loading failed');
            setLoading(false);
            if (onError) onError(err);
        }
    };

    // Hook 2: Load JSON Content
    // MOVED UP: Must be unconditional (hook order rule), but logic inside is conditional
    useEffect(() => {
        // Only run if we are in json mode, have a format spec, and content isn't loaded yet
        // AND checks for manifest availability are implicit via dependencies or internal checks
        if (activeFormat === 'json' && jsonFormat?.enabled && !jsonContent && book) {
            const loadJson = async () => {
                try {
                    const jsonPath = `${manifestDir}/${jsonFormat.root}/${jsonFormat.files?.path}`;
                    const contentStr = await FileSystem.readAsStringAsync(jsonPath);
                    setJsonContent(JSON.parse(contentStr));
                } catch (e) {
                    console.error("Failed to load JSON content", e);
                    setError("Text content could not be loaded");
                }
            };
            loadJson();
        }
    }, [activeFormat, currentLocation?.bookId, manifestDir, jsonFormat, book, jsonContent]);

    const handlePageChange = (page: number, _total: number) => {
        if (currentLocation) {
            const newLoc = { ...currentLocation, pageNumber: page };
            setCurrentLocation(newLoc);
            if (onLocationChange) onLocationChange(newLoc);
        }
    };

    // --- Conditional Rendering Guards (AFTER all Hooks) ---

    if (loading) {
        return (
            <View style={[styles.center, styles.container]}>
                <ActivityIndicator size="large" />
                <Text style={styles.text}>Loading Reader...</Text>
            </View>
        );
    }

    if (error || !manifest) {
        return (
            <View style={[styles.center, styles.container]}>
                <Text style={styles.errorText}>Error: {error}</Text>
            </View>
        );
    }

    if (!currentLocation) {
        return (
            <View style={[styles.center, styles.container]}>
                <Text style={styles.text}>No Book Selected</Text>
            </View>
        )
    }

    if (!book) {
        return (
            <View style={[styles.center, styles.container]}>
                <Text style={styles.errorText}>Book not found: {currentLocation.bookId}</Text>
            </View>
        )
    }

    const pdfFormat = book.formats.pdf;

    // --- Render Logic ---

    // 1. Valid PDF Render
    if (activeFormat === 'pdf' && pdfFormat && pdfFormat.enabled) {
        const pdfPath = `${manifestDir}/${pdfFormat.root}/${pdfFormat.files?.path}`;

        return (
            <View style={styles.container}>
                <PdfRenderer
                    uri={pdfPath}
                    page={currentLocation.pageNumber}
                    onPageChanged={handlePageChange}
                    onError={(e) => {
                        console.error("PDF Error", e);
                        setError("PDF Load Error");
                    }}
                />
            </View>
        );
    }

    // 2. Valid Text Render
    if (activeFormat === 'json' && jsonFormat && jsonFormat.enabled) {
        if (!jsonContent) {
            return (
                <View style={[styles.center, styles.container]}>
                    <ActivityIndicator size="small" />
                    <Text>Loading Text Content...</Text>
                </View>
            );
        }
        return (
            <View style={styles.container}>
                <ReaderHeader
                    title={book.title}
                    sectionTitle={currentSection}
                    currentPage={currentLocation.pageNumber || 1}
                    totalPage={jsonContent?.blocks ? Math.ceil(jsonContent.blocks.length / 8) : undefined}
                />
                <SegmentRenderer
                    content={useMemo(() => ({
                        blocks: jsonContent.blocks,
                        title: book.title
                    }), [jsonContent, book.title])}
                    config={config}
                    onLocationChange={(loc) => handlePageChange(loc.pageNumber || 1, 1)}
                    onFootnotePress={handleFootnotePress}
                    onSectionChange={(section) => {
                        console.log('[RisaleReader] onSectionChange called with:', section);
                        setCurrentSection(section);
                    }}
                    onLugatLookup={handleLugatLookup}
                />
                <FootnotePanel
                    isVisible={!!activeFootnoteContent}
                    content={activeFootnoteContent}
                    onClose={() => setActiveFootnoteContent(null)}
                />
                <LugatBottomSheet
                    visible={lugatVisible}
                    onClose={() => setLugatVisible(false)}
                />
            </View>
        );
    }

    // 3. Fallback / Switcher Hint
    if (activeFormat === 'pdf' && (!pdfFormat || !pdfFormat.enabled) && jsonFormat?.enabled) {
        // Effect-like state update during render is risky but acceptable for "derived state" fixups
        // Better to use useEffect for this too, but for now this is the logic
        // To be safe, let's wrap in a zero-delay timeout or just return null and let an effect handle it
        // Or strictly, just render the error and let user switch manually? 
        // For auto-switch:
        setTimeout(() => setActiveFormat('json'), 0);
        return (
            <View style={[styles.center, styles.container]}>
                <ActivityIndicator size="small" />
                <Text>Switching to Text Mode...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.center, styles.container]}>
            <Text>
                Selected format ({activeFormat}) is not available for this book.
                {"\n"}
                Available formats: {book ? Object.keys(book.formats).join(', ') : 'None'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        marginTop: 10,
        fontSize: 16,
        color: '#333'
    },
    errorText: {
        color: 'red',
        fontSize: 16
    }
});
