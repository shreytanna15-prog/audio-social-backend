import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/admin/lib/cn";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                primary: "bg-primary text-on-primary hover:brightness-110",
                secondary:
                    "border border-border bg-transparent text-foreground hover:bg-muted/50",
                ghost:
                    "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                destructive:
                    "border border-destructive/20 bg-destructive/15 text-destructive hover:bg-destructive/25",
            },
            size: {
                default: "h-9 px-3.5",
                sm: "h-8 px-3 text-xs",
                lg: "h-10 px-4",
                icon: "h-8 w-8",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => (
        <button
            ref={ref}
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        />
    )
);
Button.displayName = "Button";
