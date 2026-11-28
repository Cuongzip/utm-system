"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChamferButton } from "./ChamferButton";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    pageSize?: number;
    itemLabel?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
    pageSize = 10,
    itemLabel,
}: PaginationProps) {
    const t = useTranslations("common");
    const resolvedItemLabel = itemLabel ?? t("items");

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

    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-[var(--color-surface-panel)] border-t border-[var(--color-border-default)] select-none">
            <span className="text-[11px] font-mono tabular-nums text-[var(--color-text-secondary)]">
                {t("showingRange", {
                    start: startIndex,
                    end: endIndex,
                    total: totalItems,
                    label: resolvedItemLabel,
                })}
            </span>

            {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                    <ChamferButton
                        variant="outline"
                        size="xs"
                        clip="sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        aria-label={t("previousPage")}
                        innerClassName="px-2.5 font-medium"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">{t("prev")}</span>
                    </ChamferButton>

                    <span className="sm:hidden px-2 text-xs font-mono font-semibold tabular-nums text-[var(--color-text-primary)]">
                        {currentPage} / {totalPages}
                    </span>

                    <div className="hidden sm:flex items-center gap-1.5">
                        {pageNumbers.map((page, idx) =>
                            page === "ellipsis" ? (
                                <span
                                    key={`ellipsis-${idx}`}
                                    className="w-6 text-center text-xs text-slate-400 font-mono"
                                >
                                    …
                                </span>
                            ) : page === currentPage ? (
                                <ChamferButton
                                    key={page}
                                    variant="dark"
                                    size="xs"
                                    clip="sm"
                                    onClick={() => onPageChange(page)}
                                    aria-label={t("pageNumber", { page })}
                                    aria-current="page"
                                    className="w-7 px-0 font-mono tabular-nums"
                                >
                                    {page}
                                </ChamferButton>
                            ) : (
                                <ChamferButton
                                    key={page}
                                    variant="outline"
                                    size="xs"
                                    clip="sm"
                                    onClick={() => onPageChange(page)}
                                    aria-label={t("pageNumber", { page })}
                                    className="w-7"
                                    innerClassName="px-0 font-mono font-medium tabular-nums"
                                >
                                    {page}
                                </ChamferButton>
                            )
                        )}
                    </div>

                    <ChamferButton
                        variant="outline"
                        size="xs"
                        clip="sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        aria-label={t("nextPage")}
                        innerClassName="px-2.5 font-medium"
                    >
                        <span className="hidden sm:inline">{t("next")}</span>
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </ChamferButton>
                </div>
            )}
        </div>
    );
}
