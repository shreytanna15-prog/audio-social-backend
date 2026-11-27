export const QUERY_REGISTRY = {
    auth: {
        me: ["admin", "auth", "me"] as const,
    },
    metrics: {
        growth: (range: string) =>
            ["admin", "metrics", "growth", range] as const,
    },
    users: {
        list: (params?: Record<string, unknown>) =>
            ["admin", "users", "list", params] as const,
        detail: (id: string) => ["admin", "users", id] as const,
        tracks: (id: string, params?: Record<string, unknown>) =>
            ["admin", "users", id, "tracks", params] as const,
        playlists: (id: string, params?: Record<string, unknown>) =>
            ["admin", "users", id, "playlists", params] as const,
        albums: (id: string, params?: Record<string, unknown>) =>
            ["admin", "users", id, "albums", params] as const,
        feedClips: (id: string, params?: Record<string, unknown>) =>
            ["admin", "users", id, "feed-clips", params] as const,
    },
} as const;

export const MUTATION_REGISTRY = {
    auth: {
        login: ["admin", "auth", "login"] as const,
        logout: ["admin", "auth", "logout"] as const,
    },
} as const;
