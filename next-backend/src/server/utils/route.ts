import { NextRequest, NextResponse } from "next/server";
import { apiWrapper } from "@/server/utils/global-error";
import type { ApiHandler, ApiMiddleware, NextFunction } from "@/server/types/request";
import { createApiRequest } from "@/server/types/request";

export function composeRoute(
    middlewares: ApiMiddleware[],
    handler: ApiHandler
) {
    return async (nextReq: NextRequest): Promise<NextResponse> => {
        const req = createApiRequest(nextReq);

        return new Promise<NextResponse>((resolve, reject) => {
            let index = 0;

            const next: NextFunction = (error) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (index >= middlewares.length) {
                    Promise.resolve(handler(req)).then(resolve).catch(reject);
                    return;
                }

                const middleware = middlewares[index++];
                Promise.resolve(middleware(req, null, next)).catch(reject);
            };

            next();
        });
    };
}

export function createRoute(
    middlewares: ApiMiddleware[],
    handler: ApiHandler
) {
    return apiWrapper(composeRoute(middlewares, handler));
}

export class RouteBuilder {
    private middlewares: ApiMiddleware[] = [];

    use(middleware: ApiMiddleware) {
        this.middlewares.push(middleware);
        return this;
    }

    handle(handler: ApiHandler) {
        return apiWrapper(composeRoute(this.middlewares, handler));
    }
}

export const route = () => new RouteBuilder();
