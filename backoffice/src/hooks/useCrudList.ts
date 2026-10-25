"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface UseCrudListOptions<T extends { id?: string }> {
    fetchFn: () => Promise<T[] | { items?: T[] }>;
    deleteFn?: (id: string) => Promise<unknown>;
    entityName?: string;
    autoFetch?: boolean;
}

export function useCrudList<T extends { id?: string }>({
    fetchFn,
    deleteFn,
    entityName = "Item",
    autoFetch = true,
}: UseCrudListOptions<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<T | null>(null);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchFn();
            const list = Array.isArray(res) ? res : res?.items || [];
            setItems(list);
            setError(null);
        } catch {
            setError(`Failed to fetch ${entityName.toLowerCase()}s`);
        } finally {
            setLoading(false);
        }
    }, [fetchFn, entityName]);

    useEffect(() => {
        if (autoFetch) {
            refresh();
        }
    }, [autoFetch, refresh]);

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
                await refresh();
            } catch {
                toast.error(`Failed to delete ${entityName.toLowerCase()}`);
                setError(`Failed to delete ${entityName.toLowerCase()}`);
            }
        },
        [deleteFn, entityName, highlightedId, refresh]
    );

    return {
        items,
        setItems,
        loading,
        setLoading,
        error,
        setError,
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
