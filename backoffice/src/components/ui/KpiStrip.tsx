"use client";

import React from "react";
import { cn } from "@/lib";
import { ChamferCard } from "./ChamferCard";
import { Skeleton } from "./Skeleton";

export interface KpiItem {
    id: string;
    label: string;
    value: string | number;
    subValue?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    active?: boolean;
    onClick?: () => void;
}

export interface KpiStripProps {
    items: KpiItem[];
    loading?: boolean;
    columns?: 3 | 4 | 5 | 6;
    footerBar?: React.ReactNode;
    className?: string;
}

const GRID_COL_CLASSES: Record<NonNullable<KpiStripProps["columns"]>, string> = {
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
};

export function KpiStrip({ items, loading = false, columns, footerBar, className }: KpiStripProps) {
    const resolvedCols =
        columns ?? (items.length === 3 ? 3 : items.length === 5 ? 5 : items.length >= 6 ? 6 : 4);

    return (
        <ChamferCard
            size="md"
            className={cn("w-full shrink-0", className)}
            innerClassName="overflow-hidden"
        >
            <div
                className={cn(
                    "grid gap-px bg-[var(--color-border-default)] w-full",
                    GRID_COL_CLASSES[resolvedCols]
                )}
            >
                {items.map((item) => {
                    const Icon = item.icon;
                    const isInteractive = Boolean(item.onClick);
                    const cellContent = (
                        <>
                            <div className="flex items-center justify-between gap-2 w-full">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)] truncate">
                                    {item.label}
                                </span>
                                {Icon && (
                                    <Icon
                                        className="w-3.5 h-3.5 shrink-0 text-slate-400"
                                        aria-hidden="true"
                                    />
                                )}
                            </div>

                            {loading ? (
                                <div className="flex items-baseline gap-2 pt-1" aria-busy="true">
                                    <Skeleton className="h-6 w-12" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 pt-0.5">
                                    <span className="font-mono text-2xl font-bold text-[var(--color-text-primary)] tabular-nums tracking-tight leading-tight">
                                        {item.value}
                                    </span>
                                    {item.subValue && (
                                        <span className="text-[11px] font-mono text-[var(--color-text-muted)] truncate">
                                            {item.subValue}
                                        </span>
                                    )}
                                </div>
                            )}
                        </>
                    );

                    if (isInteractive) {
                        return (
                            <button
                                key={item.id}
                                type="button"
                                aria-pressed={item.active}
                                onClick={item.onClick}
                                className={cn(
                                    "relative px-4 py-3 flex flex-col justify-between gap-1 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400",
                                    item.active
                                        ? "bg-slate-100/90"
                                        : "bg-[var(--color-surface-panel)] hover:bg-[var(--color-surface-subtle)]"
                                )}
                            >
                                {item.active && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute inset-x-0 bottom-0 h-[2px] bg-slate-900"
                                    />
                                )}
                                {cellContent}
                            </button>
                        );
                    }

                    return (
                        <div
                            key={item.id}
                            className="px-4 py-3 bg-[var(--color-surface-panel)] flex flex-col justify-between gap-1 min-w-0"
                        >
                            {cellContent}
                        </div>
                    );
                })}
            </div>

            {footerBar && (
                <div className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-panel)]">
                    {footerBar}
                </div>
            )}
        </ChamferCard>
    );
}
