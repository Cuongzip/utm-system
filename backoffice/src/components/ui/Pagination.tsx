"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib";

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    showPageSize?: boolean;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
    className,
}: PaginationProps) {
    const pageNumbers = useMemo(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (currentPage <= 4) {
            return [1, 2, 3, 4, 5, "ellipsis", totalPages] as (number | "ellipsis")[];
        }
        if (currentPage >= totalPages - 3) {
            return [
                1,
                "ellipsis",
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages,
            ] as (number | "ellipsis")[];
        }
        return [
            1,
            "ellipsis",
            currentPage - 1,
            currentPage,
            currentPage + 1,
            "ellipsis",
            totalPages,
        ] as (number | "ellipsis")[];
    }, [currentPage, totalPages]);

    if (totalItems === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                "flex items-center justify-end px-5 py-3 bg-[var(--color-surface-panel)] border-t border-[var(--color-border-default)] select-none",
                className
            )}
        >
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    aria-label="Previous Page"
                    className={cn(
                        "chamfer-sm",
                        "h-8 px-2.5 flex items-center gap-1 text-xs font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] transition-colors cursor-pointer",
                        "hover:bg-[var(--color-surface-card)] hover:text-[var(--color-text-primary)]",
                        "disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-surface-subtle)] disabled:hover:text-[var(--color-text-secondary)]"
                    )}
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prev</span>
                </button>

                {pageNumbers.map((page, idx) =>
                    page === "ellipsis" ? (
                        <span
                            key={`ellipsis-${idx}`}
                            className="w-7 text-center text-xs text-slate-400 font-mono"
                        >
                            ...
                        </span>
                    ) : (
                        <button
                            key={page}
                            type="button"
                            onClick={() => onPageChange(page)}
                            aria-label={`Page ${page}`}
                            aria-current={page === currentPage ? "page" : undefined}
                            className={cn(
                                "chamfer-sm",
                                "w-8 h-8 flex items-center justify-center text-xs font-mono transition-colors cursor-pointer",
                                page === currentPage
                                    ? "bg-[var(--color-border-dark)] text-white font-bold border border-[var(--color-border-dark)] shadow-xs"
                                    : "bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-default)]"
                            )}
                        >
                            {page}
                        </button>
                    )
                )}

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    aria-label="Next Page"
                    className={cn(
                        "chamfer-sm",
                        "h-8 px-2.5 flex items-center gap-1 text-xs font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] transition-colors cursor-pointer",
                        "hover:bg-[var(--color-surface-card)] hover:text-[var(--color-text-primary)]",
                        "disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-surface-subtle)] disabled:hover:text-[var(--color-text-secondary)]"
                    )}
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

export default Pagination;
