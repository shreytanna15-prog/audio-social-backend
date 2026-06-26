import { ZodError, ZodType } from "zod";
import { AppError } from "@/server/utils/global-error";
import type { ApiMiddleware } from "@/server/types/request";

export const validateBody = (schema: ZodType): ApiMiddleware => {
    return async (req, _res, next) => {
        try {
            const json = await req.json();
            req.body = schema.parse(json);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                if (
                    error.issues[0].code === "invalid_type" ||
                    error.issues[0].code === "unrecognized_keys"
                ) {
                    throw new AppError("Invalid payload data", 400, "BAD_REQUEST");
                }
                throw new AppError(error.issues[0].message, 400, "BAD_REQUEST");
            }
            next(error);
        }
    };
};

export const validateQuery = (schema: ZodType): ApiMiddleware => {
    return (req, _res, next) => {
        try {
            const query = Object.fromEntries(req.nextUrl.searchParams);
            req.localsQuery = schema.parse(query);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                throw new AppError(error.issues[0].message, 400, "BAD_REQUEST");
            }
            next(error);
        }
    };
};
