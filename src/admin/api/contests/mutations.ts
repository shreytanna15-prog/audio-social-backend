"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    cancelAdminContest,
    confirmAdminContestWinners,
    createAdminContest,
    patchAdminContest,
} from "@/admin/api/contests/api";
import { MUTATION_REGISTRY, QUERY_REGISTRY } from "@/admin/api/registry";
import type { MutationOptions } from "@/admin/api/types";
import type {
    CreateContestBody,
    ContestSummary,
    PatchContestBody,
} from "@/admin/api/contests/types";

export function useCreateAdminContest(
    options?: MutationOptions<ContestSummary, CreateContestBody>
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: MUTATION_REGISTRY.contests.create,
        mutationFn: createAdminContest,
        ...options,
        onSuccess: async (data, variables, onMutateResult, context) => {
            await queryClient.invalidateQueries({
                queryKey: ["admin", "contests"],
            });
            toast.success("Contest created");
            await options?.onSuccess?.(data, variables, onMutateResult, context);
        },
        onError: (error, variables, onMutateResult, context) => {
            toast.error(error.message);
            options?.onError?.(error, variables, onMutateResult, context);
        },
    });
}

export function usePatchAdminContest(
    options?: MutationOptions<
        ContestSummary,
        { id: string; body: PatchContestBody }
    >
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: MUTATION_REGISTRY.contests.update,
        mutationFn: ({
            id,
            body,
        }: {
            id: string;
            body: PatchContestBody;
        }) => patchAdminContest(id, body),
        ...options,
        onSuccess: async (data, variables, onMutateResult, context) => {
            await queryClient.invalidateQueries({
                queryKey: QUERY_REGISTRY.contests.detail(variables.id),
            });
            await queryClient.invalidateQueries({
                queryKey: ["admin", "contests"],
            });
            toast.success("Contest updated");
            await options?.onSuccess?.(data, variables, onMutateResult, context);
        },
        onError: (error, variables, onMutateResult, context) => {
            toast.error(error.message);
            options?.onError?.(error, variables, onMutateResult, context);
        },
    });
}

export function useCancelAdminContest(
    options?: MutationOptions<ContestSummary, string>
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: MUTATION_REGISTRY.contests.cancel,
        mutationFn: cancelAdminContest,
        ...options,
        onSuccess: async (data, variables, onMutateResult, context) => {
            await queryClient.invalidateQueries({
                queryKey: QUERY_REGISTRY.contests.detail(variables),
            });
            await queryClient.invalidateQueries({
                queryKey: ["admin", "contests"],
            });
            toast.success("Contest cancelled");
            await options?.onSuccess?.(data, variables, onMutateResult, context);
        },
        onError: (error, variables, onMutateResult, context) => {
            toast.error(error.message);
            options?.onError?.(error, variables, onMutateResult, context);
        },
    });
}

export function useConfirmAdminContestWinners(
    options?: MutationOptions<
        { contest: ContestSummary; ranking: unknown[] },
        string
    >
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: MUTATION_REGISTRY.contests.confirmWinners,
        mutationFn: confirmAdminContestWinners,
        ...options,
        onSuccess: async (data, variables, onMutateResult, context) => {
            await queryClient.invalidateQueries({
                queryKey: QUERY_REGISTRY.contests.detail(variables),
            });
            await queryClient.invalidateQueries({
                queryKey: ["admin", "contests"],
            });
            toast.success("Winners confirmed");
            await options?.onSuccess?.(data, variables, onMutateResult, context);
        },
        onError: (error, variables, onMutateResult, context) => {
            toast.error(error.message);
            options?.onError?.(error, variables, onMutateResult, context);
        },
    });
}
