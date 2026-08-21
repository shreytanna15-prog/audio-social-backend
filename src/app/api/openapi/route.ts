import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { assertApiDocsEnabled } from "@/server/openapi/assert-docs-enabled";
import { buildOpenApiDocument } from "@/server/openapi/document";

export const GET = route().handle(async () => {
    assertApiDocsEnabled();
    return NextResponse.json(buildOpenApiDocument());
});
