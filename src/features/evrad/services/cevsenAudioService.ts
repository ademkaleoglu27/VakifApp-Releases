/**
 * Cevşen-ül Kebir Audio Stream Service
 * High-reliability GitHub Release audio streaming for Cevşen recitations.
 */

export interface CevsenAudioTrack {
    id: number;
    title: string;
    babNumber: number;
    audioUrl: string;
}

class CevsenAudioService {
    private readonly BASE_AUDIO_URL = 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/v1.0-audio';

    /**
     * Get audio track for a specific Bab (1 - 100) mapped to 4 parts
     */
    public getTrackForBab(babNumber: number): CevsenAudioTrack {
        let partName = 'cevsen_part1.mp3';
        if (babNumber >= 26 && babNumber <= 50) {
            partName = 'cevsen_part2.mp3';
        } else if (babNumber >= 51 && babNumber <= 75) {
            partName = 'cevsen_part3.mp3';
        } else if (babNumber >= 76) {
            partName = 'cevsen_part4.mp3';
        }

        return {
            id: babNumber,
            title: `${babNumber}. Bab`,
            babNumber,
            audioUrl: `${this.BASE_AUDIO_URL}/${partName}`,
        };
    }

    /**
     * Get audio track for a group of Babs (e.g. 1-10, 11-20...)
     */
    public getTrackForGroup(startBab: number, endBab: number): CevsenAudioTrack {
        const track = this.getTrackForBab(startBab);
        return {
            id: Math.floor((startBab - 1) / 10) + 1,
            title: `${startBab} - ${endBab}. Bab`,
            babNumber: startBab,
            audioUrl: track.audioUrl,
        };
    }

    /**
     * Get full recitation URL
     */
    public getFullAudioUrl(): string {
        return `${this.BASE_AUDIO_URL}/cevsen_part1.mp3`;
    }
}

export const cevsenAudioService = new CevsenAudioService();
