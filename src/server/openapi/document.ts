import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "@/server/openapi/registry";
import "@/server/openapi/schemas";
import "@/server/openapi/paths";

export function buildOpenApiDocument() {
    const generator = new OpenApiGeneratorV31(registry.definitions);

    return generator.generateDocument({
        openapi: "3.1.0",
        info: {
            title: "Singer Social Media API",
            version: "0.1.0",
            description:
                "Backend API for the singer social media React Native app (auth).",
        },
        servers: [
            {
                url: "http://localhost:3015",
                description: "Local development",
            },
        ],
    });
}
