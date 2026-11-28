"use client";

import { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import { Label } from "@/admin/components/ui/label";
import { Button } from "@/admin/components/ui/button";
import { Calendar } from "@/admin/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/admin/components/ui/popover";
import { AppSelect } from "@/admin/components/shared/app-select";
import { cn } from "@/admin/lib/cn";

const LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
    const value = String(hour).padStart(2, "0");
    return { value, label: value };
});

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => {
    const value = String(minute).padStart(2, "0");
    return { value, label: value };
});

function parseLocalValue(value: string) {
    if (!value) return undefined;
    const parsed = parse(value, LOCAL_FORMAT, new Date());
    return isValid(parsed) ? parsed : undefined;
}

function toLocalValue(date: Date, hours: string, minutes: string) {
    const next = new Date(date);
    next.setHours(Number(hours), Number(minutes), 0, 0);
    return format(next, LOCAL_FORMAT);
}

type AppDateTimePickerProps = {
    id?: string;
    label?: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    error?: string;
    className?: string;
};

export function AppDateTimePicker({
    id,
    label,
    value,
    onChange,
    disabled,
    error,
    className,
}: AppDateTimePickerProps) {
    const [open, setOpen] = useState(false);
    const selected = useMemo(() => parseLocalValue(value), [value]);
    const hourValue = selected ? format(selected, "HH") : "00";
    const minuteValue = selected ? format(selected, "mm") : "00";

    const updateTime = (nextHour: string, nextMinute: string) => {
        const base = selected ?? new Date();
        onChange(toLocalValue(base, nextHour, nextMinute));
    };

    return (
        <div className={cn("space-y-2", className)}>
            {label ? <Label htmlFor={id}>{label}</Label> : null}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="secondary"
                        disabled={disabled}
                        className={cn(
                            "h-9 w-full cursor-pointer justify-start gap-2 px-3 font-normal",
                            !selected && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="h-4 w-4 opacity-60" />
                        {selected
                            ? format(selected, "MMM d, yyyy HH:mm")
                            : "Pick date and time"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto bg-card p-3">
                    <Calendar
                        mode="single"
                        selected={selected}
                        onSelect={(date) => {
                            if (!date) return;
                            onChange(toLocalValue(date, hourValue, minuteValue));
                        }}
                    />
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <Label>Time</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <AppSelect
                                id={`${id ?? "dt"}-hour`}
                                label="Hour"
                                value={hourValue}
                                options={HOUR_OPTIONS}
                                disabled={disabled}
                                onValueChange={(nextHour) =>
                                    updateTime(nextHour, minuteValue)
                                }
                            />
                            <AppSelect
                                id={`${id ?? "dt"}-minute`}
                                label="Minute"
                                value={minuteValue}
                                options={MINUTE_OPTIONS}
                                disabled={disabled}
                                onValueChange={(nextMinute) =>
                                    updateTime(hourValue, nextMinute)
                                }
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
            {error ? (
                <p className="text-xs text-destructive">{error}</p>
            ) : null}
        </div>
    );
}
