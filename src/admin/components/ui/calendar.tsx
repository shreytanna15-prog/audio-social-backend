"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/admin/lib/cn";
import { buttonVariants } from "@/admin/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "relative flex flex-col",
                month: "flex w-full flex-col gap-3",
                month_caption: "flex h-8 items-center justify-center",
                caption_label: "text-sm font-medium",
                nav: "absolute inset-x-0 top-0 flex items-center justify-between",
                button_previous: cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "h-7 w-7"
                ),
                button_next: cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "h-7 w-7"
                ),
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday:
                    "w-9 text-center text-[0.75rem] font-medium text-muted-foreground",
                week: "mt-1 flex w-full",
                day: "relative p-0 text-center text-sm",
                day_button: cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "h-9 w-9 cursor-pointer font-normal text-foreground",
                    "aria-selected:bg-primary aria-selected:text-on-primary aria-selected:hover:bg-primary aria-selected:hover:text-on-primary aria-selected:opacity-100"
                ),
                selected:
                    "rounded-md [&_button]:bg-primary [&_button]:text-on-primary [&_button]:hover:bg-primary [&_button]:hover:text-on-primary",
                today: "rounded-md [&_button]:bg-muted [&_button]:text-foreground",
                outside: "text-muted-foreground opacity-50",
                disabled:
                    "cursor-not-allowed text-muted-foreground opacity-40",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) =>
                    orientation === "left" ? (
                        <ChevronLeft className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    ),
            }}
            {...props}
        />
    );
}
