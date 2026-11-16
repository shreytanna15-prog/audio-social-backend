/**
 * Clients need ws:// or wss://. REALTIME_WORKER_URL is stored as an HTTP(S) base.
 */
export function toRealtimeWebSocketUrl(workerBaseUrl: string): string {
    const trimmed = workerBaseUrl.trim().replace(/\/$/, "");
    let schemeAndHost: string;
    if (trimmed.startsWith("https://")) {
        schemeAndHost = `wss://${trimmed.slice("https://".length)}`;
    } else if (trimmed.startsWith("http://")) {
        schemeAndHost = `ws://${trimmed.slice("http://".length)}`;
    } else if (
        trimmed.startsWith("wss://") ||
        trimmed.startsWith("ws://")
    ) {
        schemeAndHost = trimmed;
    } else {
        schemeAndHost = trimmed;
    }
    return schemeAndHost.endsWith("/ws")
        ? schemeAndHost
        : `${schemeAndHost}/ws`;
}
