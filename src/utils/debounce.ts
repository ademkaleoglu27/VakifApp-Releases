/**
 * debounce.ts
 * Utility function to debounce rapid function calls.
 * Used for Lugat lookups to prevent UI freeze from rapid taps.
 */

/**
 * Creates a debounced version of the provided function.
 * The debounced function will only execute after `delay` milliseconds
 * have passed since the last call.
 * 
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds (default: 800ms for Lugat)
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 800
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delay);
    };
}

/**
 * Creates a debounced async function that also cancels pending calls.
 * Returns a promise that resolves when the function finally executes.
 * 
 * @param fn - The async function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    delay: number = 800
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | null> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pendingResolve: ((value: Awaited<ReturnType<T>> | null) => void) | null = null;

    return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | null> => {
        // Cancel previous pending call
        if (timeoutId) {
            clearTimeout(timeoutId);
            if (pendingResolve) {
                pendingResolve(null); // Resolve previous promise with null
            }
        }

        return new Promise((resolve) => {
            pendingResolve = resolve;
            timeoutId = setTimeout(async () => {
                try {
                    const result = await fn(...args);
                    resolve(result);
                } catch (error) {
                    console.error('[debounceAsync] Error:', error);
                    resolve(null);
                }
                timeoutId = null;
                pendingResolve = null;
            }, delay);
        });
    };
}
