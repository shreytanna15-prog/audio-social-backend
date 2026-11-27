export const ADMIN_THEME_KEY = "vibeogram-admin-theme";

export type AdminTheme = "dark" | "light";

export function isAdminTheme(value: unknown): value is AdminTheme {
    return value === "dark" || value === "light";
}

export function readStoredAdminTheme(): AdminTheme | null {
    if (typeof window === "undefined") return null;
    try {
        const value = window.localStorage.getItem(ADMIN_THEME_KEY);
        return isAdminTheme(value) ? value : null;
    } catch {
        return null;
    }
}

export function applyAdminTheme(theme: AdminTheme) {
    if (typeof document === "undefined") return;
    const root = document.querySelector(".admin-theme");
    if (!(root instanceof HTMLElement)) return;
    root.dataset.theme = theme;
}
