"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { SearchInput } from "./SearchInput";
import { CustomSelect, type SelectOption } from "./CustomSelect";

export interface TableFilterBarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder: string;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    statusOptions: SelectOption[];
    statusPlaceholder?: string;
    onClearFilters?: () => void;
    totalCount?: number;
    filteredCount?: number;
    itemLabel?: string;
    extraSlot?: React.ReactNode;
}

export function TableFilterBar({
    searchQuery,
    onSearchChange,
    searchPlaceholder,
    statusFilter,
    onStatusFilterChange,
    statusOptions,
    statusPlaceholder,
    onClearFilters,
    totalCount,
    filteredCount,
    itemLabel,
    extraSlot,
}: TableFilterBarProps) {
    const t = useTranslations("common");
    const resolvedStatusPlaceholder = statusPlaceholder ?? t("allStatuses");
    const resolvedItemLabel = itemLabel ?? t("records");

    const hasActiveFilters =
        Boolean(searchQuery.trim()) ||
        (statusFilter !== "all" && statusFilter !== "__all__" && statusFilter !== "");

    const handleClear = () => {
        if (onClearFilters) {
            onClearFilters();
        } else {
            onSearchChange("");
            onStatusFilterChange("all");
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                <SearchInput
                    value={searchQuery}
                    onChange={onSearchChange}
                    placeholder={searchPlaceholder}
                    className="w-full sm:w-72"
                />
                <div className="w-full sm:w-48">
                    <CustomSelect
                        value={statusFilter}
                        onValueChange={(val) => onStatusFilterChange(val || "all")}
                        options={statusOptions}
                        placeholder={resolvedStatusPlaceholder}
                        ariaLabel={resolvedStatusPlaceholder}
                        className="h-[34px] text-xs font-medium border-[var(--color-border-strong)] bg-[var(--color-surface-panel)] rounded-md"
                    />
                </div>
                {extraSlot}
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="inline-flex items-center gap-1 h-[34px] px-2.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-surface-panel)] border border-[var(--color-border-strong)] rounded-md hover:bg-[var(--color-surface-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t("clear")}</span>
                    </button>
                )}
            </div>

            {hasActiveFilters && totalCount !== undefined && filteredCount !== undefined && (
                <span className="text-xs font-mono tabular-nums text-[var(--color-text-secondary)]">
                    {t("showingFiltered", {
                        filtered: filteredCount,
                        total: totalCount,
                        label: resolvedItemLabel,
                    })}
                </span>
            )}
        </div>
    );
}
