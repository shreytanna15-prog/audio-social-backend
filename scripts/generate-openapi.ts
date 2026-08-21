import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildOpenApiDocument } from "../src/server/openapi/document";

async function main() {
    const document = buildOpenApiDocument();
    const outDir = path.join(process.cwd(), "openapi");
    const outFile = path.join(outDir, "openapi.json");

    await mkdir(outDir, { recursive: true });
    await writeFile(outFile, `${JSON.stringify(document, null, 2)}\n`, "utf8");

    console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);
}

main().catch((error) => {
    console.error("Failed to generate OpenAPI document");
    console.error(error);
    process.exit(1);
});
