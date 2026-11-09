"use client";

import React from "react";
import { SearchInput } from "./SearchInput";
import { CustomSelect, type CustomSelectOption } from "./CustomSelect";

export interface TableFilterBarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    statusFilter?: string;
    onStatusFilterChange?: (value: string) => void;
    statusOptions?: CustomSelectOption[];
    statusPlaceholder?: string;
    children?: React.ReactNode;
    className?: string;
}

export function TableFilterBar({
    searchQuery,
    onSearchChange,
    searchPlaceholder = "Search...",
    statusFilter,
    onStatusFilterChange,
    statusOptions,
    statusPlaceholder = "All Statuses",
    children,
    className = "flex items-center gap-3",
}: TableFilterBarProps) {
    return (
        <div className={className}>
            <SearchInput
                value={searchQuery}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                className="w-72"
            />
            {statusOptions && onStatusFilterChange && (
                <div className="w-48">
                    <CustomSelect
                        value={statusFilter}
                        onValueChange={(val) => onStatusFilterChange(val || "all")}
                        options={statusOptions}
                        placeholder={statusPlaceholder}
                        className="h-[34px] text-xs font-medium border-[var(--color-border-strong)] bg-[var(--color-surface-panel)] rounded-md"
                    />
                </div>
            )}
            {children}
        </div>
    );
}
