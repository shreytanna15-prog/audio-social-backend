import {
    AdminApiError,
    type ApiErrorBody,
    type ApiSuccess,
} from "@/admin/api/types";

type RequestOptions = Omit<RequestInit, "body"> & {
    body?: unknown;
};

async function parseJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return null;
    }
}

export async function adminRequest<T>(
    path: string,
    options: RequestOptions = {}
): Promise<T> {
    const { body, headers, ...rest } = options;

    const response = await fetch(path, {
        ...rest,
        credentials: "include",
        headers: {
            Accept: "application/json",
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const payload = await parseJson(response);

    if (!response.ok) {
        const errorBody = payload as ApiErrorBody | null;
        throw new AdminApiError(
            errorBody?.message || `Request failed (${response.status})`,
            response.status,
            errorBody?.code
        );
    }

    const success = payload as ApiSuccess<T> | null;
    if (!success || success.success !== true) {
        throw new AdminApiError(
            "Unexpected response from admin API",
            response.status
        );
    }

    return success.data;
}
