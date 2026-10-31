import "server-only";
import z from "zod";
import "dotenv/config";

function stripWrappingQuotes(value: string): string {
    const trimmed = value.trim();
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
}

const optionalUrl = z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = stripWrappingQuotes(value);
    return trimmed.length > 0 ? trimmed : undefined;
}, z.url("Invalid REALTIME_WORKER_URL").optional());

const optionalSecret = z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = stripWrappingQuotes(value);
    return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const requiredSecret = z.preprocess(
    (value) =>
        typeof value === "string" ? stripWrappingQuotes(value) : value,
    z.string().min(1, "Invalid secret")
);

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production"]),

    DATABASE_URL: z.url("Invalid DATABASE_URL"),
    DIRECT_URL: z.url("Invalid DIRECT_URL"),

    JWT_ACCESS_SECRET: requiredSecret,
    JWT_REFRESH_SECRET: requiredSecret,

    SUPABASE_URL: z.url("Invalid SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: requiredSecret,

    /** Cloudflare Worker base URL for chat fan-out (optional until Worker is deployed). */
    REALTIME_WORKER_URL: optionalUrl,
    REALTIME_NOTIFY_SECRET: optionalSecret,
    /** Defaults to JWT_ACCESS_SECRET when unset. */
    REALTIME_TOKEN_SECRET: optionalSecret,

    /** Cloudflare R2 for profile avatar/cover (optional until Edit Profile media is used). */
    R2_ACCOUNT_ID: optionalSecret,
    R2_ACCESS_KEY_ID: optionalSecret,
    R2_SECRET_ACCESS_KEY: optionalSecret,
    R2_BUCKET: optionalSecret,
    R2_PUBLIC_BASE_URL: optionalUrl,
});

export const env = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    REALTIME_WORKER_URL: process.env.REALTIME_WORKER_URL,
    REALTIME_NOTIFY_SECRET: process.env.REALTIME_NOTIFY_SECRET,
    REALTIME_TOKEN_SECRET: process.env.REALTIME_TOKEN_SECRET,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
});
