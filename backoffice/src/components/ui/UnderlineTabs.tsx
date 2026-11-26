"use client";

import React from "react";
import { cn } from "@/lib";

export interface UnderlineTabItem<T extends string = string> {
    id: T;
    label: string;
    count?: number;
}

export interface UnderlineTabsProps<T extends string = string> {
    tabs: readonly UnderlineTabItem<T>[];
    activeTab: T;
    onTabChange: (tab: T) => void;
    ariaLabel?: string;
    rightSlot?: React.ReactNode;
    className?: string;
}

export function UnderlineTabs<T extends string = string>({
    tabs,
    activeTab,
    onTabChange,
    ariaLabel = "Section views",
    rightSlot,
    className,
}: UnderlineTabsProps<T>) {
    return (
        <div
            className={cn(
                "flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)]",
                className
            )}
        >
            <div
                role="tablist"
                aria-label={ariaLabel}
                className="flex items-center gap-1 overflow-x-auto -mb-px"
            >
                {tabs.map((tab) => {
                    const selected = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400",
                                selected
                                    ? "border-slate-900 text-[var(--color-text-primary)]"
                                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                            )}
                        >
                            <span>{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span
                                    className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums leading-none",
                                        selected
                                            ? "bg-slate-900 text-white"
                                            : "bg-slate-200/80 text-slate-700"
                                    )}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {rightSlot && <div className="flex items-center gap-2 pb-1.5">{rightSlot}</div>}
        </div>
    );
}
