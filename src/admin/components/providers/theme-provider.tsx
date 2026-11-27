"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ADMIN_THEME_KEY,
    applyAdminTheme,
    isAdminTheme,
    readStoredAdminTheme,
    type AdminTheme,
} from "@/admin/lib/theme";

type ThemeContextValue = {
    theme: AdminTheme;
    setTheme: (theme: AdminTheme) => void;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<AdminTheme>("dark");

    useEffect(() => {
        const stored = readStoredAdminTheme();
        const initial = stored ?? "dark";
        setThemeState(initial);
        applyAdminTheme(initial);
    }, []);

    const setTheme = useCallback((next: AdminTheme) => {
        setThemeState(next);
        applyAdminTheme(next);
        try {
            window.localStorage.setItem(ADMIN_THEME_KEY, next);
        } catch {
            // ignore storage failures
        }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === "dark" ? "light" : "dark");
    }, [setTheme, theme]);

    const value = useMemo(
        () => ({ theme, setTheme, toggleTheme }),
        [theme, setTheme, toggleTheme]
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useAdminTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error("useAdminTheme must be used within AdminThemeProvider");
    }
    return ctx;
}

export function useOptionalAdminTheme() {
    return useContext(ThemeContext);
}
