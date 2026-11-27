"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AdminThemeProvider, useAdminTheme } from "@/admin/components/providers/theme-provider";

function AdminToaster() {
    const { theme } = useAdminTheme();
    return (
        <Toaster
            theme={theme}
            position="top-right"
            closeButton
            toastOptions={{
                className:
                    "border border-border bg-card text-foreground shadow-lg",
            }}
        />
    );
}

export function AdminProviders({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AdminThemeProvider>
                {children}
                <AdminToaster />
            </AdminThemeProvider>
        </QueryClientProvider>
    );
}
