import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { assertApiDocsEnabled } from "@/server/openapi/assert-docs-enabled";

export const GET = route().handle(async () => {
    assertApiDocsEnabled();

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Singer Social Media API Docs</title>
    <style>
      html, body { margin: 0; height: 100%; }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/openapi"
      data-configuration='{"theme":"default"}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

    return new NextResponse(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
});
