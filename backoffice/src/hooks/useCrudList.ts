"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface UseCrudListOptions<T extends { id?: string }> {
    queryKey?: readonly unknown[];
    fetchFn: () => Promise<T[] | { items?: T[] }>;
    deleteFn?: (id: string) => Promise<unknown>;
    entityName?: string;
    autoFetch?: boolean;
    refetchInterval?: number;
}

export function useCrudList<T extends { id?: string }>({
    queryKey,
    fetchFn,
    deleteFn,
    entityName = "Item",
    autoFetch = true,
    refetchInterval,
}: UseCrudListOptions<T>) {
    const queryClient = useQueryClient();
    const effectiveKey = useMemo(
        () => queryKey || ["crud-list", entityName.toLowerCase()],
        [queryKey, entityName]
    );

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<T | null>(null);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [customError, setCustomError] = useState<string | null>(null);

    const {
        data,
        isLoading: queryLoading,
        error: queryError,
        refetch,
    } = useQuery({
        queryKey: effectiveKey,
        queryFn: async () => {
            const res = await fetchFn();
            return Array.isArray(res) ? res : res?.items || [];
        },
        enabled: autoFetch,
        refetchInterval,
    });

    const items: T[] = data || [];
    const loading = autoFetch && queryLoading;
    const error =
        customError || (queryError ? `Failed to fetch ${entityName.toLowerCase()}s` : null);

    const refresh = useCallback(async () => {
        setCustomError(null);
        await refetch();
    }, [refetch]);

    const openCreateModal = useCallback(() => {
        setItemToEdit(null);
        setIsModalOpen(true);
    }, []);

    const openEditModal = useCallback((item: T) => {
        setItemToEdit(item);
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setItemToEdit(null);
    }, []);

    const handleSelect = useCallback((item: T | null) => {
        setHighlightedId(item?.id || null);
    }, []);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => {
            if (!deleteFn) throw new Error("Delete function not provided");
            return deleteFn(id);
        },
        onSuccess: (_data, id) => {
            if (highlightedId === id) {
                setHighlightedId(null);
            }
            toast.success(`${entityName} deleted successfully`);
            queryClient.invalidateQueries({ queryKey: effectiveKey });
        },
        meta: { defaultErrorMessage: `Failed to delete ${entityName.toLowerCase()}` },
    });

    const handleDelete = useCallback(
        async (id: string) => {
            if (!deleteFn) return;
            await deleteMutation.mutateAsync(id);
        },
        [deleteFn, deleteMutation]
    );

    return {
        items,
        loading,
        error,
        setError: setCustomError,
        refresh,
        isModalOpen,
        setIsModalOpen,
        itemToEdit,
        setItemToEdit,
        openCreateModal,
        openEditModal,
        closeModal,
        highlightedId,
        setHighlightedId,
        handleSelect,
        handleDelete,
    };
}
