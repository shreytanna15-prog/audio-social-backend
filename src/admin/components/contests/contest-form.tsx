"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    TRACK_GENRES,
    TRACK_GENRE_LABELS,
} from "@/server/constants/track-genres";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Label } from "@/admin/components/ui/label";
import { Textarea } from "@/admin/components/ui/textarea";
import { AppSelect } from "@/admin/components/shared/app-select";
import { AppDateTimePicker } from "@/admin/components/shared/app-datetime-picker";
import type { CreateContestBody, ContestSummary } from "@/admin/api/contests/types";

const RESULTS_DAYS = [5, 10, 15, 20, 25, 30] as const;

const formSchema = z
    .object({
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(5000),
        rules: z.string().trim().min(1).max(10000),
        genreIds: z.array(z.string()).min(1).max(5),
        prizeNote: z.string().trim().min(1).max(2000),
        placementMode: z.enum(["FIRST", "TOP_THREE"]),
        payoutMode: z.enum(["MANUAL", "AUTO"]),
        prizeCoinsFirst: z.number().int().min(0),
        prizeCoinsSecond: z.number().int().min(0).optional(),
        prizeCoinsThird: z.number().int().min(0).optional(),
        announceAt: z.string().min(1),
        submitStartAt: z.string().min(1),
        submitEndAt: z.string().min(1),
        voteEndAt: z.string().min(1),
        resultsVisibleDays: z
            .number()
            .refine((n) => (RESULTS_DAYS as readonly number[]).includes(n), {
                message: "Pick 5, 10, 15, 20, 25, or 30 days",
            }),
    })
    .superRefine((data, ctx) => {
        if (data.placementMode === "TOP_THREE") {
            if (data.prizeCoinsSecond == null) {
                ctx.addIssue({
                    code: "custom",
                    message: "Required for top 3",
                    path: ["prizeCoinsSecond"],
                });
            }
            if (data.prizeCoinsThird == null) {
                ctx.addIssue({
                    code: "custom",
                    message: "Required for top 3",
                    path: ["prizeCoinsThird"],
                });
            }
        }
    });

type FormValues = z.infer<typeof formSchema>;

const numberField = {
    valueAsNumber: true as const,
};

const placementOptions = [
    { value: "FIRST", label: "1st only" },
    { value: "TOP_THREE", label: "Top 3" },
];

const payoutOptions = [
    { value: "MANUAL", label: "Manual confirm" },
    { value: "AUTO", label: "Auto on close" },
];

const resultsDayOptions = RESULTS_DAYS.map((d) => ({
    value: String(d),
    label: `${d} days`,
}));

function toLocalInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDates() {
    const now = new Date();
    const addDays = (n: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() + n);
        return toLocalInput(d.toISOString());
    };
    return {
        announceAt: addDays(0),
        submitStartAt: addDays(1),
        submitEndAt: addDays(7),
        voteEndAt: addDays(14),
    };
}

type ContestFormProps = {
    mode: "create" | "edit";
    initial?: ContestSummary;
    limitedEdit?: boolean;
    submitting?: boolean;
    onSubmit: (body: CreateContestBody) => void;
};

export function ContestForm({
    mode,
    initial,
    limitedEdit = false,
    submitting,
    onSubmit,
}: ContestFormProps) {
    const dates = defaultDates();
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initial?.title ?? "",
            description: initial?.description ?? "",
            rules: initial?.rules ?? "",
            genreIds: initial?.genreIds ?? [],
            prizeNote: initial?.prizeNote ?? "",
            placementMode: initial?.placementMode ?? "FIRST",
            payoutMode: initial?.payoutMode ?? "MANUAL",
            prizeCoinsFirst: initial?.prizeCoinsFirst ?? 100,
            prizeCoinsSecond: initial?.prizeCoinsSecond ?? undefined,
            prizeCoinsThird: initial?.prizeCoinsThird ?? undefined,
            announceAt: initial
                ? toLocalInput(initial.announceAt)
                : dates.announceAt,
            submitStartAt: initial
                ? toLocalInput(initial.submitStartAt)
                : dates.submitStartAt,
            submitEndAt: initial
                ? toLocalInput(initial.submitEndAt)
                : dates.submitEndAt,
            voteEndAt: initial
                ? toLocalInput(initial.voteEndAt)
                : dates.voteEndAt,
            resultsVisibleDays: initial?.resultsVisibleDays ?? 15,
        },
    });

    const placementMode = form.watch("placementMode");
    const selectedGenres = form.watch("genreIds");

    useEffect(() => {
        if (placementMode === "FIRST") {
            form.setValue("prizeCoinsSecond", undefined);
            form.setValue("prizeCoinsThird", undefined);
        }
    }, [placementMode, form]);

    const toggleGenre = (id: string) => {
        const current = form.getValues("genreIds");
        if (current.includes(id)) {
            form.setValue(
                "genreIds",
                current.filter((g) => g !== id),
                { shouldValidate: true }
            );
            return;
        }
        if (current.length >= 5) return;
        form.setValue("genreIds", [...current, id], { shouldValidate: true });
    };

    const handleSubmit = form.handleSubmit((values) => {
        onSubmit({
            title: values.title,
            description: values.description,
            rules: values.rules,
            genreIds: values.genreIds,
            prizeNote: values.prizeNote,
            placementMode: values.placementMode,
            payoutMode: values.payoutMode,
            prizeCoinsFirst: values.prizeCoinsFirst,
            prizeCoinsSecond:
                values.placementMode === "TOP_THREE"
                    ? (values.prizeCoinsSecond ?? 0)
                    : null,
            prizeCoinsThird:
                values.placementMode === "TOP_THREE"
                    ? (values.prizeCoinsThird ?? 0)
                    : null,
            announceAt: new Date(values.announceAt).toISOString(),
            submitStartAt: new Date(values.submitStartAt).toISOString(),
            submitEndAt: new Date(values.submitEndAt).toISOString(),
            voteEndAt: new Date(values.voteEndAt).toISOString(),
            resultsVisibleDays: values.resultsVisibleDays,
        });
    });

    const fieldDisabled = limitedEdit;

    return (
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <section className="space-y-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
                {limitedEdit ? (
                    <p className="text-sm text-muted-foreground">
                        Submit has started. Only prize note, payout mode, and
                        results visibility can change.
                    </p>
                ) : null}

                <div className="space-y-4">
                    <h2 className="text-base font-semibold tracking-tight">
                        Basics
                    </h2>
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            disabled={fieldDisabled}
                            {...form.register("title")}
                        />
                        {form.formState.errors.title ? (
                            <p className="text-xs text-destructive">
                                {form.formState.errors.title.message}
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            disabled={fieldDisabled}
                            {...form.register("description")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rules">Rules</Label>
                        <Textarea
                            id="rules"
                            disabled={fieldDisabled}
                            {...form.register("rules")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Genres (1-5)</Label>
                        <div className="flex flex-wrap gap-1.5">
                            {TRACK_GENRES.map((id) => {
                                const active = selectedGenres.includes(id);
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        disabled={fieldDisabled}
                                        onClick={() => toggleGenre(id)}
                                        className={`cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                            active
                                                ? "border-primary bg-primary/15 text-foreground"
                                                : "border-border text-muted-foreground hover:bg-muted/40"
                                        }`}
                                    >
                                        {TRACK_GENRE_LABELS[id]}
                                    </button>
                                );
                            })}
                        </div>
                        {form.formState.errors.genreIds ? (
                            <p className="text-xs text-destructive">
                                Select 1 to 5 genres
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                    <h2 className="text-base font-semibold tracking-tight">
                        Prizes
                    </h2>
                    <div className="space-y-2">
                        <Label htmlFor="prizeNote">Prize note</Label>
                        <Input
                            id="prizeNote"
                            {...form.register("prizeNote")}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Controller
                            control={form.control}
                            name="placementMode"
                            render={({ field }) => (
                                <AppSelect
                                    id="placementMode"
                                    label="Placement"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={placementOptions}
                                    disabled={fieldDisabled}
                                />
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="payoutMode"
                            render={({ field }) => (
                                <AppSelect
                                    id="payoutMode"
                                    label="Payout"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={payoutOptions}
                                />
                            )}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="prizeCoinsFirst">1st coins</Label>
                            <Input
                                id="prizeCoinsFirst"
                                type="number"
                                disabled={fieldDisabled}
                                {...form.register(
                                    "prizeCoinsFirst",
                                    numberField
                                )}
                            />
                        </div>
                        {placementMode === "TOP_THREE" ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="prizeCoinsSecond">
                                        2nd coins
                                    </Label>
                                    <Input
                                        id="prizeCoinsSecond"
                                        type="number"
                                        disabled={fieldDisabled}
                                        {...form.register(
                                            "prizeCoinsSecond",
                                            numberField
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="prizeCoinsThird">
                                        3rd coins
                                    </Label>
                                    <Input
                                        id="prizeCoinsThird"
                                        type="number"
                                        disabled={fieldDisabled}
                                        {...form.register(
                                            "prizeCoinsThird",
                                            numberField
                                        )}
                                    />
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                    <h2 className="text-base font-semibold tracking-tight">
                        Schedule
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Controller
                            control={form.control}
                            name="announceAt"
                            render={({ field }) => (
                                <AppDateTimePicker
                                    id="announceAt"
                                    label="Announce at"
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={fieldDisabled}
                                    error={
                                        form.formState.errors.announceAt
                                            ?.message
                                    }
                                />
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="submitStartAt"
                            render={({ field }) => (
                                <AppDateTimePicker
                                    id="submitStartAt"
                                    label="Submit start"
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={fieldDisabled}
                                    error={
                                        form.formState.errors.submitStartAt
                                            ?.message
                                    }
                                />
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="submitEndAt"
                            render={({ field }) => (
                                <AppDateTimePicker
                                    id="submitEndAt"
                                    label="Submit end"
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={fieldDisabled}
                                    error={
                                        form.formState.errors.submitEndAt
                                            ?.message
                                    }
                                />
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="voteEndAt"
                            render={({ field }) => (
                                <AppDateTimePicker
                                    id="voteEndAt"
                                    label="Vote end"
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={fieldDisabled}
                                    error={
                                        form.formState.errors.voteEndAt
                                            ?.message
                                    }
                                />
                            )}
                        />
                    </div>

                    <Controller
                        control={form.control}
                        name="resultsVisibleDays"
                        render={({ field }) => (
                            <AppSelect
                                id="resultsVisibleDays"
                                label="Show results for (days after vote end)"
                                value={String(field.value)}
                                onValueChange={(v) =>
                                    field.onChange(Number(v))
                                }
                                options={resultsDayOptions}
                                className="max-w-xs"
                            />
                        )}
                    />
                </div>

                <div className="border-t border-border pt-5">
                    <Button type="submit" disabled={submitting}>
                        {mode === "create" ? "Create contest" : "Save changes"}
                    </Button>
                </div>
            </section>
        </form>
    );
}
