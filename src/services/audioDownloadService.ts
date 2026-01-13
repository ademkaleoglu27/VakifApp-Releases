
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const AUDIO_DIR = `${FileSystem.documentDirectory}audio/`;

// BASE URL for GitHub Releases or any other host
// The user will need to update this URL after creating the release.
// We can use a placeholder for now or a configurable constant.
export const AUDIO_BASE_URL = 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/v1.0-audio/';


export const AudioDownloadService = {

    async ensureAudioDirectory(): Promise<void> {
        const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
        }
    },

    getLocalUri(filename: string): string {
        return `${AUDIO_DIR}${filename}`;
    },

    async checkFileExists(filename: string): Promise<boolean> {
        const fileInfo = await FileSystem.getInfoAsync(this.getLocalUri(filename));
        return fileInfo.exists;
    },

    async downloadFile(filename: string, onProgress?: (progress: number) => void): Promise<string> {
        await this.ensureAudioDirectory();

        const remoteUrl = `${AUDIO_BASE_URL}${filename}`;
        const localUri = this.getLocalUri(filename);

        const downloadResumable = FileSystem.createDownloadResumable(
            remoteUrl,
            localUri,
            {},
            (downloadProgress) => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                if (onProgress) {
                    onProgress(progress);
                }
            }
        );

        try {
            const result = await downloadResumable.downloadAsync();
            if (result && result.uri) {
                return result.uri;
            } else {
                throw new Error('Download failed');
            }
        } catch (e) {
            console.error(`Failed to download ${filename}`, e);
            throw e;
        }
    },

    async deleteFile(filename: string): Promise<void> {
        const localUri = this.getLocalUri(filename);
        await FileSystem.deleteAsync(localUri, { idempotent: true });
    }
};
