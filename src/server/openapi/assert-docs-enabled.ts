import { env } from "@/server/config/env";
import { AppError } from "@/server/utils/global-error";

export function assertApiDocsEnabled() {
    if (env.NODE_ENV !== "development") {
        throw new AppError("Not found", 404, "RESOURCE_NOT_FOUND");
    }
}
