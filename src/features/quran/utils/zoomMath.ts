
import { Dimensions } from 'react-native';

// Standard Medina Mushaf: 2200 x 3185
const IMG_WIDTH = 2200;
const IMG_HEIGHT = 3185;

export interface ClampResult {
    x: number;
    y: number;
}

/**
 * Calculates the exact drawn dimensions of the image using "contain" fit.
 */
export function getDrawnDimensions(vw: number, vh: number) {
    'worklet';
    const scaleToFit = Math.min(vw / IMG_WIDTH, vh / IMG_HEIGHT);
    return {
        width: IMG_WIDTH * scaleToFit,
        height: IMG_HEIGHT * scaleToFit,
        scaleFit: scaleToFit
    };
}

export function calculateClamp(
    scale: number,
    tx: number,
    ty: number,
    vw: number,
    vh: number
): ClampResult {
    'worklet';

    const { width: drawW, height: drawH } = getDrawnDimensions(vw, vh);

    // Zoomed size
    const zoomW = drawW * scale;
    const zoomH = drawH * scale;

    // Available slack (how much the image is larger than the screen)
    // If zoomW < vw, slack is negative (centering logic needed if we cared about strict centering, but usually we just clamp to 0)
    // Clamp range is [-maxX, +maxX]
    const maxX = Math.max(0, (zoomW - vw) / 2);
    const maxY = Math.max(0, (zoomH - vh) / 2);

    return {
        x: Math.min(maxX, Math.max(-maxX, tx)),
        y: Math.min(maxY, Math.max(-maxY, ty)),
    };
}

export function getSnapDecision(
    tx: number,
    vx: number,
    width: number
): 'prev' | 'next' | 'stay' {
    'worklet';

    // User Requirement: 
    // Trigger only if abs(tx) > 0.40 * width AND abs(vx) > 800

    const TRANSLATION_THRESHOLD = width * 0.40;
    const VELOCITY_THRESHOLD = 800;

    // Check Previous Page (Swipe Right -> Positive Translation)
    if (tx > TRANSLATION_THRESHOLD && vx > VELOCITY_THRESHOLD) {
        return 'prev';
    }

    // Check Next Page (Swipe Left -> Negative Translation)
    if (tx < -TRANSLATION_THRESHOLD && vx < -VELOCITY_THRESHOLD) {
        return 'next';
    }

    return 'stay';
}
