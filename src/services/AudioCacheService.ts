import * as FileSystem from 'expo-file-system';

const AUDIO_CACHE_DIR = (FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '') + 'audio_cache/';

export const AudioCacheService = {
    async ensureCacheDir(): Promise<void> {
        try {
            const info = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
            if (!info.exists) {
                await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true });
            }
        } catch { }
    },

    getFilenameForUrl(url: string): string {
        // Hash the full URL so query parameters (e.g. ?q=... for TTS) create distinct files
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        const clean = url.split('?')[0].split('#')[0];
        const parts = clean.split('/');
        const rawName = (parts[parts.length - 1] || 'audio').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 24);
        return `${rawName}_${Math.abs(hash)}.mp3`;
    },

    /**
     * Resolves an audio URI. If it's a remote URL, downloads and caches it locally,
     * resolving 302 redirects properly so Android MediaPlayer never fails.
     */
    async resolveAudioSource(source: any): Promise<any> {
        if (!source || typeof source !== 'object' || !source.uri) {
            return source; // Bundled require('./sound.mp3') asset
        }

        const url = source.uri as string;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return source; // Local file:// uri
        }

        try {
            await this.ensureCacheDir();
            const filename = this.getFilenameForUrl(url);
            const localPath = `${AUDIO_CACHE_DIR}${filename}`;

            const info = await FileSystem.getInfoAsync(localPath);
            if (info.exists && info.size && info.size > 1000) {
                console.log('[AudioCache] Playing from cached file:', localPath);
                return { uri: localPath };
            }

            console.log('[AudioCache] Pre-fetching audio stream to avoid Android 302 issue:', url);
            const downloadRes = await FileSystem.downloadAsync(url, localPath);
            if (downloadRes && downloadRes.status === 200) {
                console.log('[AudioCache] Downloaded OK to:', downloadRes.uri);
                return { uri: downloadRes.uri };
            }
        } catch (err) {
            console.warn('[AudioCache] Pre-fetch failed, falling back to direct stream:', err);
        }

        return source;
    }
};
