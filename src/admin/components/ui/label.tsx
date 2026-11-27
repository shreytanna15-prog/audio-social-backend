import * as React from "react";
import { cn } from "@/admin/lib/cn";

export function Label({
    className,
    ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
    return (
        <label
            className={cn(
                "text-[13px] font-medium leading-[18px] text-foreground",
                className
            )}
            {...props}
        />
    );
}
