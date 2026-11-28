import * as React from "react";
import { cn } from "@/admin/lib/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => (
        <textarea
            ref={ref}
            className={cn(
                "flex min-h-24 w-full rounded-md border border-border bg-surface-lowest px-3 py-2 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] placeholder:text-muted-foreground/70 focus-visible:border-primary/55 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
    )
);
Textarea.displayName = "Textarea";
