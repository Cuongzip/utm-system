"use client";

import { useState, useMemo, useCallback } from "react";

export interface UsePaginationOptions {
    defaultPageSize?: number;
}

export function usePagination<T>(items?: T[], options?: UsePaginationOptions) {
    const [pageState, setPageState] = useState<{ itemsRef: T[] | undefined; page: number }>({
        itemsRef: items,
        page: 1,
    });
    const pageSize = options?.defaultPageSize ?? 10;

    const currentPage = pageState.itemsRef === items ? pageState.page : 1;

    const setCurrentPage = useCallback(
        (nextPage: number | ((prev: number) => number)) => {
            setPageState((prev) => {
                const base = prev.itemsRef === items ? prev.page : 1;
                const resolved = typeof nextPage === "function" ? nextPage(base) : nextPage;
                return { itemsRef: items, page: resolved };
            });
        },
        [items]
    );

    const totalItems = items?.length ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedItems = useMemo(() => {
        if (!items || items.length === 0) return [];
        const start = (safeCurrentPage - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, safeCurrentPage, pageSize]);

    return {
        currentPage: safeCurrentPage,
        totalPages,
        totalItems,
        paginatedItems,
        setCurrentPage,
    };
}
