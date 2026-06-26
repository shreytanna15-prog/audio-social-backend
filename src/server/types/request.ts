import { NextRequest, NextResponse } from "next/server";

export type ApiRequest = Omit<NextRequest, "body"> & {
    body?: unknown;
    localsQuery?: unknown;
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

/** Wraps NextRequest so req.body / req.localsQuery are our parsed values, not the raw stream. */
export function createApiRequest(nextReq: NextRequest): ApiRequest {
    const state: { body?: unknown; localsQuery?: unknown } = {};

    return new Proxy(nextReq, {
        get(target, prop, receiver) {
            if (prop === "body") return state.body;
            if (prop === "localsQuery") return state.localsQuery;

            const value = Reflect.get(target, prop, receiver);
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
            return Reflect.set(target, prop, value, receiver);
        },
    }) as ApiRequest;
}
