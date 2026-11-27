import { NextRequest, NextResponse } from "next/server";
import type { User } from "@/generated/prisma/client";

export type AdminAuthContext = {
    id: string;
    email: string;
    name: string | null;
};

export type ApiRequest = Omit<NextRequest, "body"> & {
    body?: unknown;
    localsQuery?: unknown;
    user?: User;
    admin?: AdminAuthContext;
};

export type NextFunction = (error?: unknown) => void;

export type ApiMiddleware = (
    req: ApiRequest,
    res: unknown,
    next: NextFunction
) => Promise<void> | void;

export type ApiHandler = (
    req: ApiRequest
) => Promise<NextResponse> | NextResponse;

export function createApiRequest(nextReq: NextRequest): ApiRequest {
    const state: {
        body?: unknown;
        localsQuery?: unknown;
        user?: User;
        admin?: AdminAuthContext;
    } = {};

    return new Proxy(nextReq, {
        get(target, prop) {
            if (prop === "body") return state.body;
            if (prop === "localsQuery") return state.localsQuery;
            if (prop === "user") return state.user;
            if (prop === "admin") return state.admin;

            const value = Reflect.get(target, prop, target);
            return typeof value === "function" ? value.bind(target) : value;
        },
        set(target, prop, value, receiver) {
            if (prop === "body") {
                state.body = value;
                return true;
            }
            if (prop === "localsQuery") {
                state.localsQuery = value;
                return true;
            }
            if (prop === "user") {
                state.user = value as User;
                return true;
            }
            if (prop === "admin") {
                state.admin = value as AdminAuthContext;
                return true;
            }
            return Reflect.set(target, prop, value, receiver);
        },
    }) as ApiRequest;
}
