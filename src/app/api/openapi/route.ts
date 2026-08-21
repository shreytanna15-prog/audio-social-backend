import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/server/openapi/document";

export const GET = async () => {
    return NextResponse.json(buildOpenApiDocument());
};
