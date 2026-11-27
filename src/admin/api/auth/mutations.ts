"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { loginAdmin, logoutAdmin } from "@/admin/api/auth/api";
import { MUTATION_REGISTRY, QUERY_REGISTRY } from "@/admin/api/registry";
import type { MutationOptions } from "@/admin/api/types";
import type {
    AdminLoginBody,
    AdminLoginResult,
} from "@/admin/api/auth/types";

export function useAdminLogin(
    options?: MutationOptions<AdminLoginResult, AdminLoginBody>
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: MUTATION_REGISTRY.auth.login,
        mutationFn: loginAdmin,
        ...options,
        onSuccess: async (data, variables, onMutateResult, context) => {
            await queryClient.invalidateQueries({
                queryKey: QUERY_REGISTRY.auth.me,
            });
            await options?.onSuccess?.(data, variables, onMutateResult, context);
        },
        onError: (error, variables, onMutateResult, context) => {
            toast.error(error.message);
            options?.onError?.(error, variables, onMutateResult, context);
        },
    });
}

export function useAdminLogout(options?: MutationOptions<null, void>) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: MUTATION_REGISTRY.auth.logout,
        mutationFn: () => logoutAdmin(),
        ...options,
        onSuccess: async (data, variables, onMutateResult, context) => {
            queryClient.removeQueries({ queryKey: QUERY_REGISTRY.auth.me });
            await options?.onSuccess?.(data, variables, onMutateResult, context);
        },
        onError: (error, variables, onMutateResult, context) => {
            toast.error(error.message);
            options?.onError?.(error, variables, onMutateResult, context);
        },
    });
}
