import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
} from "@/server/openapi/registry";
import {
    audioUploadUrlSuccessResponseSchema,
    chatMessageSuccessResponseSchema,
    conversationIdParamSchema,
    conversationListSuccessResponseSchema,
    conversationSummarySuccessResponseSchema,
    createConversationRequestSuccessResponseSchema,
    listMessagesSuccessResponseSchema,
    messageRequestListSuccessResponseSchema,
    realtimeTokenSuccessResponseSchema,
} from "@/server/openapi/schemas";
import {
    createConversationRequestSchema,
    listMessagesQuerySchema,
    sendAudioMessageSchema,
    sendTextMessageSchema,
} from "@/server/modules/conversation/conversation.validator";

const conversationIdParamsSchema = z.object({
    id: conversationIdParamSchema,
});

registry.registerPath({
    method: "post",
    path: "/api/conversations/request",
    tags: ["Conversations"],
    summary: "Create or renew a message request",
    security: [...bearerSecurity],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createConversationRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Message request created",
            content: {
                "application/json": {
                    schema: createConversationRequestSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/conversations",
    tags: ["Conversations"],
    summary: "List accepted conversations (inbox)",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Inbox fetched",
            content: {
                "application/json": {
                    schema: conversationListSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/conversations/requests",
    tags: ["Conversations"],
    summary: "List incoming message requests",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Requests fetched",
            content: {
                "application/json": {
                    schema: messageRequestListSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/conversations/{id}/accept",
    tags: ["Conversations"],
    summary: "Accept a message request",
    security: [...bearerSecurity],
    request: { params: conversationIdParamsSchema },
    responses: {
        200: {
            description: "Accepted",
            content: {
                "application/json": {
                    schema: conversationSummarySuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/conversations/{id}/decline",
    tags: ["Conversations"],
    summary: "Decline a message request",
    security: [...bearerSecurity],
    request: { params: conversationIdParamsSchema },
    responses: {
        200: {
            description: "Declined",
            content: {
                "application/json": {
                    schema: conversationSummarySuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/conversations/{id}/messages",
    tags: ["Conversations"],
    summary: "List messages in a conversation",
    security: [...bearerSecurity],
    request: {
        params: conversationIdParamsSchema,
        query: listMessagesQuerySchema,
    },
    responses: {
        200: {
            description: "Messages fetched",
            content: {
                "application/json": {
                    schema: listMessagesSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/conversations/{id}/messages",
    tags: ["Conversations"],
    summary: "Send a text message",
    security: [...bearerSecurity],
    request: {
        params: conversationIdParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: sendTextMessageSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Message sent",
            content: {
                "application/json": {
                    schema: chatMessageSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/conversations/{id}/audio-upload-url",
    tags: ["Conversations"],
    summary: "Create signed upload URL for a voice note",
    security: [...bearerSecurity],
    request: { params: conversationIdParamsSchema },
    responses: {
        200: {
            description: "Upload URL created",
            content: {
                "application/json": {
                    schema: audioUploadUrlSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/conversations/{id}/messages/audio",
    tags: ["Conversations"],
    summary: "Complete voice-note message after upload",
    security: [...bearerSecurity],
    request: {
        params: conversationIdParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: sendAudioMessageSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Voice note sent",
            content: {
                "application/json": {
                    schema: chatMessageSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/conversations/{id}/realtime-token",
    tags: ["Conversations"],
    summary: "Mint a short-lived realtime join token",
    security: [...bearerSecurity],
    request: { params: conversationIdParamsSchema },
    responses: {
        200: {
            description: "Token created",
            content: {
                "application/json": {
                    schema: realtimeTokenSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
