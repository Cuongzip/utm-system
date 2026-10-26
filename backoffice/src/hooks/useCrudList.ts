"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { showApiError } from "@/utils";

export interface UseCrudListOptions<T extends { id?: string }> {
    queryKey?: readonly unknown[];
    fetchFn: () => Promise<T[] | { items?: T[] }>;
    deleteFn?: (id: string) => Promise<unknown>;
    entityName?: string;
    autoFetch?: boolean;
}

export function useCrudList<T extends { id?: string }>({
    queryKey,
    fetchFn,
    deleteFn,
    entityName = "Item",
    autoFetch = true,
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

    const handleDelete = useCallback(
        async (id: string) => {
            if (!deleteFn) return;
            try {
                await deleteFn(id);
                if (highlightedId === id) {
                    setHighlightedId(null);
                }
                toast.success(`${entityName} deleted successfully`);
                queryClient.invalidateQueries({ queryKey: effectiveKey });
            } catch (err: unknown) {
                const { message } = showApiError(
                    err,
                    `Failed to delete ${entityName.toLowerCase()}`
                );
                setCustomError(message);
            }
        },
        [deleteFn, entityName, highlightedId, queryClient, effectiveKey]
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
