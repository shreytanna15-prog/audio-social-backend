import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/admin/components/auth/login-form";
import { VibeOGramLogo } from "@/admin/components/brand/vibeogram-logo";
import { ThemeToggle } from "@/admin/components/shared/theme-toggle";

export const metadata: Metadata = {
    title: "Sign in",
};

export default function AdminLoginPage() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
            <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>

            <div className="mb-8 flex flex-col items-center gap-2.5">
                <VibeOGramLogo idPrefix="login" className="h-9 w-[200px]" />
                <p className="text-[13px] text-muted-foreground">admin portal</p>
            </div>

            <div className="w-full max-w-[400px] rounded-2xl border border-border bg-card px-7 py-8 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
                <div className="mb-6 space-y-1.5">
                    <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
                        Sign in
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Super Admin access only.
                    </p>
                </div>

                <Suspense
                    fallback={
                        <div className="h-48 animate-pulse rounded-lg bg-muted/25" />
                    }
                >
                    <LoginForm />
                </Suspense>
            </div>

            <p className="mt-10 text-xs text-muted-foreground/70">
                © VibeOGram Admin Panel
            </p>
        </div>
    );
}
