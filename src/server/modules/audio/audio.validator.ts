import { z } from "@/server/lib/zod";

const EFFECT_IDS = ["denoise", "enhance", "reverb", "echo", "modulate"] as const;

const appliedEffectSchema = z.object({
    id: z.enum(EFFECT_IDS, { message: "Invalid effect id" }),
    params: z.record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean()])
    ),
});

export const createAudioSchema = z
    .object({
        id: z.uuid("Invalid audio ID"),
        title: z
            .string()
            .trim()
            .min(1, "Title is required")
            .max(100, "Title must be less than 100 characters"),
        duration: z
            .number()
            .int("Duration must be a whole number of seconds")
            .min(0, "Duration must be 0 or greater"),
        appliedEffects: z.array(appliedEffectSchema).default([]),
    })
    .openapi("CreateAudioBody");

export const listAudiosQuerySchema = z
    .object({
        status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    })
    .openapi("ListAudiosQuery");

export const updateAudioSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(1, "Title is required")
            .max(100, "Title must be less than 100 characters")
            .optional(),
        duration: z
            .number()
            .int("Duration must be a whole number of seconds")
            .min(0, "Duration must be 0 or greater")
            .optional(),
        appliedEffects: z.array(appliedEffectSchema).optional(),
    })
    .refine(
        (data) =>
            data.title !== undefined ||
            data.duration !== undefined ||
            data.appliedEffects !== undefined,
        { message: "At least one field is required" }
    )
    .openapi("UpdateAudioBody");

export type CreateAudioSchema = z.infer<typeof createAudioSchema>;
export type ListAudiosQuerySchema = z.infer<typeof listAudiosQuerySchema>;
export type UpdateAudioSchema = z.infer<typeof updateAudioSchema>;
