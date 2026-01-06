import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { RisaleReader, ReaderLocation } from '../../../modules/risale-reader';
import { RisaleDownloadService } from '@/services/risaleDownloadService';
import { RisaleUserDb } from '@/services/risaleUserDb';

// This component acts as a BRIDGE between the Main App and the Isolated Module
export const RisaleReaderAdapter = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();

    // Params from AppNavigator
    const { bookId, title, uri } = route.params;

    const [isReady, setIsReady] = useState(false);
    const [manifestUri, setManifestUri] = useState<string | null>(null);
    const [initialLocation, setInitialLocation] = useState<ReaderLocation>({ bookId, pageNumber: 1 });

    useEffect(() => {
        prepareReader();
    }, [bookId]);

    const prepareReader = async () => {
        try {
            // 1. Check if Book exists
            // We need to generate a temporary manifest for the Reader Module
            // because the Reader Module STRICTLY requires a manifest.json

            const readerRoot = `${FileSystem.documentDirectory}risale_reader_session/`;
            await FileSystem.deleteAsync(readerRoot, { idempotent: true });
            await FileSystem.makeDirectoryAsync(readerRoot, { intermediates: true });

            // 2. Resolve PDF Path
            // Using logic from RisalePdfReader:
            let pdfPath = uri;
            if (!pdfPath && bookId) {
                pdfPath = `${FileSystem.documentDirectory}risale/${bookId}.pdf`;
            }

            // Check if file exists
            const info = await FileSystem.getInfoAsync(pdfPath);
            if (!info.exists) {
                Alert.alert("Hata", "Kitap dosyası bulunamadı. Lütfen indirdiğinizden emin olun.");
                navigation.goBack();
                return;
            }

            // 3. Create Session Manifest
            // The Reader Module expects files to be enabled in manifest.
            // We can point the manifest "path" to the absolute path if we handle it in ManifestParser (which we did basic version of).
            // BUT, our ManifestParser in Faz 1 assumes relative paths.
            // We need to either copy the PDF to session dir OR update ManifestParser to handle absolute paths.
            // For performance (don't copy 15MB PDF), let's abuse the "root" property in manifest or fix the parser.
            // Let's copy for SAFETY in Faz 2 to ensure total isolation as requested ("Reader ayrı klasörde çalışacak")

            // Copying PDF to reader session
            const sessionBookDir = `${readerRoot}books/${bookId}/pdf/`;
            await FileSystem.makeDirectoryAsync(sessionBookDir, { intermediates: true });
            const destPath = `${sessionBookDir}${bookId}.pdf`;
            await FileSystem.copyAsync({ from: pdfPath, to: destPath });

            const manifest = {
                version: "1.0",
                buildDate: new Date().toISOString(),
                books: {
                    [bookId]: {
                        id: bookId,
                        title: title || bookId,
                        formats: {
                            pdf: {
                                enabled: true,
                                root: `books/${bookId}/pdf`,
                                files: {
                                    path: `${bookId}.pdf`
                                }
                            }
                        }
                    }
                }
            };

            const manifestPath = `${readerRoot}manifest.json`;
            await FileSystem.writeAsStringAsync(manifestPath, JSON.stringify(manifest));

            // 4. Load Saved Progress
            const progress = await RisaleDownloadService.getProgress(bookId);
            if (progress && progress.lastPage > 1) {
                setInitialLocation({ bookId, pageNumber: progress.lastPage });
            }

            setManifestUri(manifestPath);
            setIsReady(true);

        } catch (e: any) {
            console.error(e);
            Alert.alert("Hazırlık Hatası", e.message);
            navigation.goBack();
        }
    };

    const handleLocationChange = (loc: ReaderLocation) => {
        // Sync back to App Storage
        // Debounce this in real app, but for now direct call
        RisaleDownloadService.saveProgress(loc.bookId, loc.pageNumber);
        RisaleUserDb.saveHistory(loc.bookId, loc.pageNumber); // Also save to history/analytics
    };

    if (!isReady || !manifestUri) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0F766E" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <RisaleReader
                manifestUri={manifestUri}
                initialLocation={initialLocation}
                config={{ theme: 'light', useScrollMode: false }}
                onClose={() => navigation.goBack()}
                onLocationChange={handleLocationChange}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff'
    }
});
