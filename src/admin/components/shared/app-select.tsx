"use client";

import { Label } from "@/admin/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/admin/components/ui/select";
import { cn } from "@/admin/lib/cn";

export type AppSelectOption = {
    value: string;
    label: string;
};

type AppSelectProps = {
    id?: string;
    label?: string;
    value: string;
    onValueChange: (value: string) => void;
    options: AppSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    className?: string;
    triggerClassName?: string;
};

export function AppSelect({
    id,
    label,
    value,
    onValueChange,
    options,
    placeholder = "Select",
    disabled,
    error,
    className,
    triggerClassName,
}: AppSelectProps) {
    return (
        <div className={cn("space-y-2", className)}>
            {label ? <Label htmlFor={id}>{label}</Label> : null}
            <Select
                value={value}
                onValueChange={onValueChange}
                disabled={disabled}
            >
                <SelectTrigger id={id} className={triggerClassName}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {error ? (
                <p className="text-xs text-destructive">{error}</p>
            ) : null}
        </div>
    );
}
