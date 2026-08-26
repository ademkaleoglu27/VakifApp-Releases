
import { create } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

export interface FCMConfig {
    client_email: string;
    private_key: string;
    project_id: string;
}

async function getAccessToken(config: FCMConfig): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: config.client_email,
        sub: config.client_email,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        scope: "https://www.googleapis.com/auth/cloud-platform",
    };

    // Import private key
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = config.private_key
        .replace(/\\n/g, "\n")
        .replace(pemHeader, "")
        .replace(pemFooter, "")
        .replace(/\s/g, "");

    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const key = await crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        false,
        ["sign"]
    );

    const jwt = await create({ alg: "RS256", typ: "JWT" }, payload, key);

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    });

    const data = await response.json();
    if (data.error) throw new Error(`Google Auth Error: ${data.error_description || data.error}`);
    return data.access_token;
}

export async function sendFCMNotification(
    token: string,
    title: string,
    body: string,
    data?: any,
    config?: FCMConfig
) {
    if (!config) return { success: false, error: "FCM Config missing" };

    try {
        const accessToken = await getAccessToken(config);
        // FCM v1 API requires ALL data values to be strings
        const stringifiedData: Record<string, string> = {};
        if (data && typeof data === 'object') {
            for (const [key, value] of Object.entries(data)) {
                stringifiedData[key] = typeof value === 'string' ? value : JSON.stringify(value);
            }
        }

        const message = {
            message: {
                token: token,
                notification: {
                    title: title,
                    body: body,
                },
                data: stringifiedData,
                android: {
                    priority: "HIGH",
                    notification: {
                        channel_id: "default",
                        sound: "default",
                        notification_priority: "PRIORITY_MAX",
                    },
                },
            },
        };

        const response = await fetch(
            `https://fcm.googleapis.com/v1/projects/${config.project_id}/messages:send`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(message),
            }
        );

        const result = await response.json();
        return { success: response.ok, result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export interface PushResult {
    expoSent: number;
    expoFailed: number;
    fcmSent: number;
    fcmFailed: number;
    errors: string[];
}

export async function sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: any,
    fcmConfigStr?: string
): Promise<PushResult> {
    const expoTokens = tokens.filter(t => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'));
    const fcmTokens = tokens.filter(t => !t.startsWith('ExponentPushToken') && !t.startsWith('ExpoPushToken'));

    console.log(`[PushNotification] Total: ${tokens.length}, Expo: ${expoTokens.length}, FCM: ${fcmTokens.length}`);

    // 1. Expo Send
    const expoResult = await sendToExpo(expoTokens, title, body, data);

    // 2. FCM Send
    const fcmResult = await sendToFCM(fcmTokens, title, body, data, fcmConfigStr);

    return {
        expoSent: expoResult.successCount,
        expoFailed: expoResult.failureCount,
        fcmSent: fcmResult.successCount,
        fcmFailed: fcmResult.failureCount,
        errors: [...expoResult.errors, ...fcmResult.errors]
    };
}

async function sendToExpo(tokens: string[], title: string, body: string, data?: any) {
    if (tokens.length === 0) return { successCount: 0, failureCount: 0, errors: [] };

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: tokens,
                sound: 'default',
                title,
                body,
                data: data || {},
            }),
        });

        const responseData = await response.json();
        console.log(`[Expo Push] Response:`, JSON.stringify(responseData));

        if (response.ok) {
            // Check individual ticket statuses
            const tickets = responseData?.data || [];
            const failed = tickets.filter((t: any) => t.status === 'error');
            const succeeded = tickets.filter((t: any) => t.status === 'ok');
            return {
                successCount: succeeded.length || tokens.length,
                failureCount: failed.length,
                errors: failed.map((t: any) => `Expo: ${t.message || t.details?.error || 'unknown'}`)
            };
        } else {
            return { successCount: 0, failureCount: tokens.length, errors: [`Expo API Error: ${JSON.stringify(responseData)}`] };
        }
    } catch (e) {
        return { successCount: 0, failureCount: tokens.length, errors: [`Expo Fetch Error: ${e.message}`] };
    }
}

async function sendToFCM(tokens: string[], title: string, body: string, data?: any, fcmConfigStr?: string) {
    if (tokens.length === 0) return { successCount: 0, failureCount: 0, errors: [] };
    if (!fcmConfigStr) {
        return { successCount: 0, failureCount: tokens.length, errors: ["FCM_SERVICE_ACCOUNT missing"] };
    }

    try {
        const fcmConfig = JSON.parse(fcmConfigStr) as FCMConfig;
        const fcmPromises = tokens.map(token =>
            sendFCMNotification(token, title, body, data, fcmConfig)
                .then(res => ({ success: res.success, token, error: res.error }))
        );

        const results = await Promise.all(fcmPromises);

        return {
            successCount: results.filter(r => r.success).length,
            failureCount: results.filter(r => !r.success).length,
            errors: results.filter(r => !r.success).map(r => `FCM ${r.token.substring(0, 10)}...: ${r.error}`)
        };
    } catch (e) {
        return { successCount: 0, failureCount: tokens.length, errors: [`FCM Setup Error: ${e.message}`] };
    }
}
