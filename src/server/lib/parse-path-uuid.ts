import { z } from "@/server/lib/zod";
import { AppError } from "@/server/utils/global-error";

/**
 * Parse a UUID path segment. For nested routes like `/api/users/:id/follow`,
 * pass `offsetFromEnd` so `follow` is skipped (e.g. offsetFromEnd = 1).
 */
export function parsePathUuid(
    pathname: string,
    label: string,
    offsetFromEnd = 0
): string {
    const segments = pathname.split("/").filter(Boolean);
    const value = segments.at(-(1 + offsetFromEnd));
    const parsed = z.uuid(`Invalid ${label}`).safeParse(value);

    if (!parsed.success) {
        throw new AppError(`Invalid ${label}`, 400, "BAD_REQUEST");
    }

    return parsed.data;
}
