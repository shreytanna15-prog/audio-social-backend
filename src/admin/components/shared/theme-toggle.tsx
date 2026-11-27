"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/admin/components/ui/button";
import { useAdminTheme } from "@/admin/components/providers/theme-provider";
import { cn } from "@/admin/lib/cn";

type ThemeToggleProps = {
    className?: string;
    size?: "sm" | "icon";
};

export function ThemeToggle({ className, size = "icon" }: ThemeToggleProps) {
    const { theme, toggleTheme } = useAdminTheme();
    const isDark = theme === "dark";

    return (
        <Button
            type="button"
            variant="ghost"
            size={size === "sm" ? "sm" : "icon"}
            className={cn(className)}
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Light theme" : "Dark theme"}
        >
            {isDark ? (
                <Sun className="h-4 w-4" />
            ) : (
                <Moon className="h-4 w-4" />
            )}
            {size === "sm" ? (
                <span>{isDark ? "Light" : "Dark"}</span>
            ) : null}
        </Button>
    );
}
