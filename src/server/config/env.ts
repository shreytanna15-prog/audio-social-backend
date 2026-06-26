import "server-only";
import z from 'zod';
import "dotenv/config";

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production']),

    DATABASE_URL: z.url("Invalid DATABASE_URL"),
    DIRECT_URL: z.url("Invalid DIRECT_URL"),
    
    JWT_ACCESS_SECRET: z.string("Invalid JWT_ACCESS_SECRET"),
    JWT_REFRESH_SECRET: z.string("Invalid JWT_REFRESH_SECRET"),

    SUPABASE_URL: z.url("Invalid SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: z.string("Invalid SUPABASE_SERVICE_ROLE_KEY"),
});

export const env = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});