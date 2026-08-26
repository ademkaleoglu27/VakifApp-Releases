/**
 * TelemetryService.ts
 * Event logging service for AI Assist analytics.
 * Logs events for tracking feature usage and success rates.
 */

// ============================================================================
// TYPES
// ============================================================================

export type TelemetryEvent =
    | { type: 'lookup_miss'; word: string; bookId?: string }
    | { type: 'lookup_suggestion_shown'; word: string; suggestionCount: number }
    | { type: 'lookup_suggestion_selected'; word: string; selectedWord: string }
    | { type: 'search_no_result'; query: string }
    | { type: 'search_suggestion_shown'; query: string; suggestionCount: number }
    | { type: 'search_suggestion_selected'; query: string; selectedQuery: string }
    | { type: 'ai_fallback_used'; feature: 'lugat' | 'search'; input: string }
    | { type: 'ai_success_opened_result'; feature: 'lugat' | 'search'; input: string };

type TelemetryEventWithTimestamp = TelemetryEvent & {
    timestamp: number;
    sessionId?: string;
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    // Maximum events to store locally before flushing
    MAX_BUFFER_SIZE: 100,

    // Whether to log to console (dev mode)
    CONSOLE_LOG: __DEV__ || false,

    // Whether to send to remote analytics (TODO: implement)
    REMOTE_ENABLED: false,
};

// ============================================================================
// STATE
// ============================================================================

let eventBuffer: TelemetryEventWithTimestamp[] = [];
let sessionId: string | null = null;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getSessionId(): string {
    if (!sessionId) {
        sessionId = generateSessionId();
    }
    return sessionId;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export const TelemetryService = {
    /**
     * Logs a telemetry event.
     */
    log(event: TelemetryEvent): void {
        const timestampedEvent: TelemetryEventWithTimestamp = {
            ...event,
            timestamp: Date.now(),
            sessionId: getSessionId(),
        };

        // Add to buffer
        eventBuffer.push(timestampedEvent);

        // Console log in dev mode
        if (CONFIG.CONSOLE_LOG) {
            console.log('[Telemetry]', JSON.stringify(timestampedEvent));
        }

        // Flush if buffer is full
        if (eventBuffer.length >= CONFIG.MAX_BUFFER_SIZE) {
            this.flush();
        }
    },

    /**
     * Convenience method for logging lookup miss.
     */
    logLookupMiss(word: string, bookId?: string): void {
        this.log({ type: 'lookup_miss', word, bookId });
    },

    /**
     * Convenience method for logging search with no results.
     */
    logSearchNoResult(query: string): void {
        this.log({ type: 'search_no_result', query });
    },

    /**
     * Convenience method for logging AI fallback usage.
     */
    logAIFallbackUsed(feature: 'lugat' | 'search', input: string): void {
        this.log({ type: 'ai_fallback_used', feature, input });
    },

    /**
     * Convenience method for logging successful AI result selection.
     */
    logAISuccessOpened(feature: 'lugat' | 'search', input: string): void {
        this.log({ type: 'ai_success_opened_result', feature, input });
    },

    /**
     * Flushes the event buffer.
     * Currently just clears the buffer, but can be extended to send to remote.
     */
    flush(): void {
        if (eventBuffer.length === 0) return;

        if (CONFIG.CONSOLE_LOG) {
            console.log(`[Telemetry] Flushing ${eventBuffer.length} events`);
        }

        // TODO: Send to remote analytics service
        if (CONFIG.REMOTE_ENABLED) {
            // sendToRemote(eventBuffer);
        }

        // Clear buffer
        eventBuffer = [];
    },

    /**
     * Gets the current buffer size.
     */
    getBufferSize(): number {
        return eventBuffer.length;
    },

    /**
     * Gets aggregated stats from the buffer.
     */
    getStats(): {
        lookupMisses: number;
        searchNoResults: number;
        aiFallbackUsed: number;
        aiSuccessOpened: number;
    } {
        return {
            lookupMisses: eventBuffer.filter(e => e.type === 'lookup_miss').length,
            searchNoResults: eventBuffer.filter(e => e.type === 'search_no_result').length,
            aiFallbackUsed: eventBuffer.filter(e => e.type === 'ai_fallback_used').length,
            aiSuccessOpened: eventBuffer.filter(e => e.type === 'ai_success_opened_result').length,
        };
    },

    /**
     * Starts a new session.
     */
    startNewSession(): void {
        sessionId = generateSessionId();
        if (CONFIG.CONSOLE_LOG) {
            console.log('[Telemetry] New session:', sessionId);
        }
    },
};
