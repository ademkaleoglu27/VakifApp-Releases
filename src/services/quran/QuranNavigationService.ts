import { navigationRef } from '@/navigation/navigationUtils';
import { FeatureFlags } from '@/config/featureFlags';
import { QuranPackService } from './QuranPackService';
import { RemoteConfigService } from './RemoteConfigService';

/**
 * Unified service to handle Quran navigation with feature flag and installation checks.
 */
export const QuranNavigationService = {
    /**
     * Navigates to the Quran reader.
     * Decides between Image Reader, PDF Reader, or Download Gate based on state.
     */
    async navigateToQuran(params: { page?: number; juz?: number; surah?: number } = {}) {
        const fallbackToPdf = () => {
            console.log('[QuranNavigationService] Falling back to PDF Reader');
            navigationRef.current?.navigate('QuranDownloaderScreen', params);
        };

        try {
            if (!navigationRef.current?.isReady()) {
                console.warn('[QuranNavigationService] Navigation not ready - queuing or retrying...');
                // Optional: Wait or retry, but for now just log
                return;
            }

            // 1. Check Remote Kill-switch
            const remoteMode = await RemoteConfigService.getQuranReaderMode();
            if (remoteMode === 'pdf') {
                console.log('[QuranNavigationService] Forced PDF via remote config');
                fallbackToPdf();
                return;
            }

            // 2. Check local flag
            const isImageEnabled = FeatureFlags.QURAN_OFFLINE_PACK_ENABLED;
            if (!isImageEnabled) {
                console.log('[QuranNavigationService] Image reader disabled via local flag');
                fallbackToPdf();
                return;
            }

            // 3. Attempt to Navigate to Image Reader
            console.log('[QuranNavigationService] Navigating to QuranImageReader', params);
            navigationRef.current?.navigate('QuranImageReader', params);

        } catch (error) {
            console.error('[QuranNavigationService] Navigation Error:', error);
            fallbackToPdf();
        }
    }
};
