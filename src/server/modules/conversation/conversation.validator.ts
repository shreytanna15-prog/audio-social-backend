import { z } from "@/server/lib/zod";

export const createConversationRequestSchema = z
    .object({
        userId: z.uuid("Invalid user ID"),
        body: z
            .string()
            .trim()
            .min(1, "Message body is required")
            .max(4000, "Message body must be less than 4000 characters"),
    })
    .openapi("CreateConversationRequestBody");

export const listMessagesQuerySchema = z
    .object({
        cursor: z.uuid("Invalid cursor").optional(),
        limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .default(50),
    })
    .openapi("ListMessagesQuery");

export const sendTextMessageSchema = z
    .object({
        type: z.literal("TEXT"),
        body: z
            .string()
            .trim()
            .min(1, "Message body is required")
            .max(4000, "Message body must be less than 4000 characters"),
    })
    .openapi("SendTextMessageBody");

export const sendAudioMessageSchema = z
    .object({
        path: z
            .string()
            .trim()
            .min(1, "Audio path is required")
            .max(500, "Audio path is too long"),
        durationMs: z
            .number()
            .int("Duration must be a whole number of milliseconds")
            .min(1, "Duration must be at least 1ms")
            .max(10 * 60 * 1000, "Voice note too long"),
    })
    .openapi("SendAudioMessageBody");

export type CreateConversationRequestSchema = z.infer<
    typeof createConversationRequestSchema
>;
export type ListMessagesQuerySchema = z.infer<typeof listMessagesQuerySchema>;
export type SendTextMessageSchema = z.infer<typeof sendTextMessageSchema>;
export type SendAudioMessageSchema = z.infer<typeof sendAudioMessageSchema>;
