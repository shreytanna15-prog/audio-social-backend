import { z } from "@/server/lib/zod";

export const createProjectSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(1, "Title is required")
            .max(100, "Title must be less than 100 characters"),
        description: z
            .string()
            .trim()
            .max(500, "Description must be less than 500 characters")
            .nullish()
            .transform((value) => {
                if (value == null || value === "") {
                    return null;
                }
                return value;
            }),
    })
    .openapi("CreateProjectBody");

export const updateProjectSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(1, "Title is required")
            .max(100, "Title must be less than 100 characters")
            .optional(),
        description: z
            .string()
            .trim()
            .max(500, "Description must be less than 500 characters")
            .nullish()
            .transform((value) => {
                if (value === undefined) {
                    return undefined;
                }
                if (value == null || value === "") {
                    return null;
                }
                return value;
            }),
    })
    .refine(
        (value) =>
            value.title !== undefined || value.description !== undefined,
        { message: "At least one field is required" }
    )
    .openapi("UpdateProjectBody");

export const attachProjectTracksSchema = z
    .object({
        trackIds: z
            .array(z.uuid("Invalid track ID"))
            .min(1, "At least one track ID is required"),
    })
    .openapi("AttachProjectTracksBody");

export const deleteProjectQuerySchema = z
    .object({
        deleteTracks: z
            .enum(["true", "false"])
            .optional()
            .transform((value) => value === "true"),
    })
    .openapi("DeleteProjectQuery");

export type CreateProjectSchema = z.infer<typeof createProjectSchema>;
export type UpdateProjectSchema = z.infer<typeof updateProjectSchema>;
export type AttachProjectTracksSchema = z.infer<
    typeof attachProjectTracksSchema
>;
export type DeleteProjectQuerySchema = z.infer<typeof deleteProjectQuerySchema>;
