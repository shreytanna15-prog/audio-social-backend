import { z } from "@/server/lib/zod";
import { PROFILE_MEDIA } from "@/server/constants/profile-media";
import { usernameSchema } from "@/server/utils/common.validator";

const emptyToNull = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
};

export const patchProfileSchema = z
    .object({
        name: z
            .string()
            .max(30, "Display name must be at most 30 characters")
            .transform(emptyToNull)
            .nullable()
            .optional(),
        bio: z
            .string()
            .max(300, "Bio must be at most 300 characters")
            .transform(emptyToNull)
            .nullable()
            .optional(),
        username: usernameSchema.optional(),
    })
    .refine(
        (value) =>
            value.name !== undefined ||
            value.bio !== undefined ||
            value.username !== undefined,
        { message: "At least one field is required" }
    )
    .openapi("PatchProfileBody");

export type PatchProfileSchema = z.infer<typeof patchProfileSchema>;

export const usernameAvailabilityQuerySchema = z
    .object({
        username: usernameSchema,
    })
    .openapi("UsernameAvailabilityQuery");

export type UsernameAvailabilityQuerySchema = z.infer<
    typeof usernameAvailabilityQuerySchema
>;

const contentTypeSchema = z.enum(PROFILE_MEDIA.contentTypes);

export const profileMediaUploadUrlSchema = z
    .object({
        contentType: contentTypeSchema,
    })
    .openapi("ProfileMediaUploadUrlBody");

export type ProfileMediaUploadUrlSchema = z.infer<
    typeof profileMediaUploadUrlSchema
>;

export const profileMediaCompleteSchema = z
    .object({
        path: z.string().min(1, "path is required"),
        contentType: contentTypeSchema,
    })
    .openapi("ProfileMediaCompleteBody");

export type ProfileMediaCompleteSchema = z.infer<
    typeof profileMediaCompleteSchema
>;
