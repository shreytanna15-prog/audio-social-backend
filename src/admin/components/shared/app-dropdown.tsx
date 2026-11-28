"use client";

import type { ReactNode } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/admin/components/ui/dropdown-menu";
import { cn } from "@/admin/lib/cn";

export type AppDropdownItem = {
    key: string;
    label: ReactNode;
    icon?: ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
    destructive?: boolean;
    shortcut?: ReactNode;
    separatorBefore?: boolean;
};

type AppDropdownProps = {
    trigger: ReactNode;
    items: AppDropdownItem[];
    label?: ReactNode;
    align?: "start" | "center" | "end";
    contentClassName?: string;
    header?: ReactNode;
};

export function AppDropdown({
    trigger,
    items,
    label,
    align = "end",
    contentClassName,
    header,
}: AppDropdownProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent
                align={align}
                className={cn("w-60", contentClassName)}
            >
                {header ? (
                    <>
                        <div className="px-2.5 py-2.5">{header}</div>
                        <DropdownMenuSeparator />
                    </>
                ) : null}
                {label ? <DropdownMenuLabel>{label}</DropdownMenuLabel> : null}
                {items.map((item) => (
                    <div key={item.key}>
                        {item.separatorBefore ? (
                            <DropdownMenuSeparator />
                        ) : null}
                        <DropdownMenuItem
                            disabled={item.disabled}
                            onSelect={(event) => {
                                if (item.disabled) {
                                    event.preventDefault();
                                    return;
                                }
                                item.onSelect?.();
                            }}
                            className={cn(
                                item.destructive &&
                                    "text-destructive focus:bg-destructive/10 focus:text-destructive"
                            )}
                        >
                            {item.icon}
                            <span className="flex-1">{item.label}</span>
                            {item.shortcut}
                        </DropdownMenuItem>
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
