import { describe, expect, it } from "vitest";
import {
    attachProjectTracksSchema,
    createProjectSchema,
    deleteProjectQuerySchema,
    updateProjectSchema,
} from "@/server/modules/project/project.validator";
import {
    loginSchema,
    signupSchema,
} from "@/server/modules/auth/auth.validator";
import {
    createConversationRequestSchema,
    sendTextMessageSchema,
} from "@/server/modules/conversation/conversation.validator";
import { createTrackSchema } from "@/server/modules/track/track.validator";

describe("project/auth/chat validators (integration)", () => {
    it("createProjectSchema trims title and nulls empty description", () => {
        expect(
            createProjectSchema.parse({
                title: "  Hooks  ",
                description: "   ",
            })
        ).toEqual({ title: "Hooks", description: null });
    });

    it("updateProjectSchema requires at least one field", () => {
        expect(() => updateProjectSchema.parse({})).toThrow();
    });

    it("attachProjectTracksSchema requires min 1 uuid", () => {
        expect(() =>
            attachProjectTracksSchema.parse({ trackIds: [] })
        ).toThrow();
        expect(
            attachProjectTracksSchema.parse({
                trackIds: ["0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f"],
            }).trackIds
        ).toHaveLength(1);
    });

    it("deleteProjectQuerySchema coerces deleteTracks flag", () => {
        expect(deleteProjectQuerySchema.parse({})).toEqual({
            deleteTracks: false,
        });
        expect(deleteProjectQuerySchema.parse({ deleteTracks: "true" })).toEqual(
            {
                deleteTracks: true,
            }
        );
    });

    it("login/signup schemas enforce email + password rules", () => {
        expect(() =>
            loginSchema.parse({ email: "bad", password: "x" })
        ).toThrow();
        expect(
            loginSchema.parse({
                email: "a@example.com",
                password: "Password1!",
            }).email
        ).toBe("a@example.com");

        expect(() =>
            signupSchema.parse({
                email: "a@example.com",
                password: "Password1!",
                name: "",
                username: "ab",
            })
        ).toThrow();
    });

    it("conversation text schemas reject empty body", () => {
        expect(() =>
            createConversationRequestSchema.parse({
                userId: "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f",
                body: "  ",
            })
        ).toThrow();
        expect(
            sendTextMessageSchema.parse({ type: "TEXT", body: " hello " }).body
        ).toBe("hello");
    });


    it("createTrackSchema accepts optional projectId", () => {
        const parsed = createTrackSchema.parse({
            id: "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f",
            kind: "SINGLE",
            title: "Take",
            durationMs: 10,
            projectId: "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1a",
            layers: [
                {
                    id: "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1b",
                    kind: "vocal",
                    name: "Vox",
                    durationMs: 10,
                },
            ],
        });
        expect(parsed.projectId).toBe(
            "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1a"
        );
    });
});
