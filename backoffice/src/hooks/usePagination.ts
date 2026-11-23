"use client";

import { useState, useMemo, useEffect } from "react";

export interface UsePaginationOptions {
    defaultPageSize?: number;
}

export function usePagination<T>(items: T[] = [], options?: UsePaginationOptions) {
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = options?.defaultPageSize ?? 10;

    const safeItems = items ?? [];

    useEffect(() => {
        setCurrentPage(1);
    }, [items]);

    const totalItems = safeItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedItems = useMemo(() => {
        const start = (safeCurrentPage - 1) * pageSize;
        return safeItems.slice(start, start + pageSize);
    }, [safeItems, safeCurrentPage, pageSize]);

    return {
        currentPage: safeCurrentPage,
        totalPages,
        totalItems,
        paginatedItems,
        setCurrentPage,
    };
}
