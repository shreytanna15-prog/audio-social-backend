import type {
    UseMutationOptions,
    UseQueryOptions,
} from "@tanstack/react-query";

export type ApiSuccess<T> = {
    success: true;
    message: string;
    data: T;
};

export type ApiErrorBody = {
    success?: false;
    code?: string;
    message: string;
};

export class AdminApiError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "AdminApiError";
        this.status = status;
        this.code = code;
    }
}

export type QueryOptions<TData> = Omit<
    UseQueryOptions<TData, AdminApiError, TData>,
    "queryKey" | "queryFn"
>;

export type MutationOptions<TData, TVariables = void> = Omit<
    UseMutationOptions<TData, AdminApiError, TVariables>,
    "mutationKey" | "mutationFn"
>;
