import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
        setupFiles: ["./tests/setup.ts"],
        coverage: {
            provider: "v8",
            include: [
                "src/server/modules/follow/**",
                "src/server/modules/user/**",
                "src/server/modules/search/**",
            ],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "server-only": path.resolve(__dirname, "./tests/mocks/server-only.ts"),
        },
    },
});
