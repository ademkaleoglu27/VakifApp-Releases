import { Platform } from 'react-native';
import { LayoutMetrics } from '../engine/types';

/**
 * Generates a stable string hash for layout/font metrics.
 * Used to key pagination cache.
 */
export const createLayoutHash = (metrics: LayoutMetrics): string => {
    const parts = [
        Platform.OS,
        metrics.width.toFixed(1),
        metrics.height.toFixed(1),
        metrics.fontSize.toFixed(1),
        metrics.lineHeight.toFixed(1),
        metrics.fontFamily || 'system',
        metrics.horizontalPadding.toFixed(1)
    ];

    // Simple DJB2-ish or just join. 
    // For readability and collision avoidance in FS keys, a joined string is fine but long.
    // Let's us a deterministic string.
    return parts.join('_');
};
