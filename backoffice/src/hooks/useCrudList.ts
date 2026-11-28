"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UseCrudListOptions<T extends { id?: string }> {
    queryKey: readonly unknown[];
    fetchFn: () => Promise<T[] | { items?: T[] }>;
    deleteFn?: (id: string) => Promise<unknown>;
    entityName: string;
    refetchInterval?: number;
}

export function useCrudList<T extends { id?: string }>({
    queryKey,
    fetchFn,
    deleteFn,
    entityName,
    refetchInterval,
}: UseCrudListOptions<T>) {
    const queryClient = useQueryClient();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<T | null>(null);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    const {
        data,
        isLoading: loading,
        isError,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            const res = await fetchFn();
            return Array.isArray(res) ? res : res?.items || [];
        },
        refetchInterval,
    });

    const items: T[] = data ?? [];

    const refresh = useCallback(async () => {
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
            queryClient.invalidateQueries({ queryKey });
        },
        meta: { defaultErrorMessage: `Failed to delete ${entityName.toLowerCase()}` },
    });

    const { mutateAsync: deleteMutateAsync } = deleteMutation;

    const handleDelete = useCallback(
        async (id: string) => {
            if (!deleteFn) return;
            await deleteMutateAsync(id);
        },
        [deleteFn, deleteMutateAsync]
    );

    return {
        items,
        loading,
        isError,
        refresh,
        isModalOpen,
        itemToEdit,
        openCreateModal,
        openEditModal,
        closeModal,
        highlightedId,
        handleSelect,
        handleDelete,
    };
}
