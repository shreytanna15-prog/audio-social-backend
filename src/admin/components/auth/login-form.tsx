"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Label } from "@/admin/components/ui/label";
import { useAdminLogin } from "@/admin/api/auth/mutations";
import { useAdminMe } from "@/admin/api/auth/queries";

const loginSchema = z.object({
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showPassword, setShowPassword] = useState(false);
    const login = useAdminLogin();
    const me = useAdminMe({ retry: false });

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    useEffect(() => {
        if (me.data) {
            router.replace("/admin");
        }
    }, [me.data, router]);

    const onSubmit = form.handleSubmit(async (values) => {
        await login.mutateAsync(values);
        const next = searchParams.get("next");
        router.replace(next && next.startsWith("/admin") ? next : "/admin");
    });

    return (
        <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="admin@vibeogram.com"
                    className="h-11 rounded-lg bg-surface-lowest"
                    {...form.register("email")}
                />
                {form.formState.errors.email ? (
                    <p className="text-xs text-destructive">
                        {form.formState.errors.email.message}
                    </p>
                ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter password"
                        className="h-11 rounded-lg bg-surface-lowest pr-11"
                        {...form.register("password")}
                    />
                    <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                            showPassword ? "Hide password" : "Show password"
                        }
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
                {form.formState.errors.password ? (
                    <p className="text-xs text-destructive">
                        {form.formState.errors.password.message}
                    </p>
                ) : null}
            </div>

            <Button
                type="submit"
                size="lg"
                className="mt-1 h-11 w-full rounded-lg text-[15px] font-semibold"
                disabled={login.isPending}
            >
                {login.isPending ? "Logging in…" : "Log in"}
            </Button>
        </form>
    );
}
