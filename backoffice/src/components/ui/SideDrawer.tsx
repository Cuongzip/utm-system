"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import { cn } from "@/lib";

export interface SideDrawerTabItem {
    key: string;
    label: string;
    count: number;
    dotClass?: string;
    disabled?: boolean;
    muted?: boolean;
}

interface SideDrawerSearchConfig {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    ariaLabel: string;
    clearLabel: string;
}

interface SideDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    subtitle?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    closeLabel: string;
    tabs?: ReadonlyArray<SideDrawerTabItem>;
    activeTab?: string | null;
    onTabChange?: (key: string) => void;
    tabsMode?: "tabs" | "toggle";
    tabsAriaLabel?: string;
    tabIdPrefix?: string;
    tabPanelId?: string;
    search?: SideDrawerSearchConfig;
    footer?: React.ReactNode;
    bodyClassName?: string;
    children: React.ReactNode;
}

const TAB_GRID_COLS: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
};

export function SideDrawer({
    open,
    onOpenChange,
    title,
    subtitle,
    icon: Icon,
    closeLabel,
    tabs,
    activeTab = null,
    onTabChange,
    tabsMode = "tabs",
    tabsAriaLabel,
    tabIdPrefix = "drawer-tab",
    tabPanelId,
    search,
    footer,
    bodyClassName,
    children,
}: SideDrawerProps) {
    const isTabList = Boolean(tabs?.length && onTabChange && tabsMode === "tabs");
    const gridColsClass = (tabs && TAB_GRID_COLS[tabs.length]) || "grid-cols-4";

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="utm-drawer-overlay fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1.5px]" />
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    className="utm-drawer-content fixed inset-y-0 right-0 z-50 w-full max-w-[448px] bg-white border-l border-[var(--color-border-strong)] shadow-2xl flex flex-col focus:outline-none"
                >
                    <div className="px-4 sm:px-5 py-3.5 bg-white border-b border-[var(--color-border-default)] flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {Icon && (
                                <span
                                    className="chamfer-xs w-8 h-8 flex items-center justify-center shrink-0 border bg-slate-100 border-slate-200 text-slate-700"
                                    aria-hidden="true"
                                >
                                    <Icon className="w-4 h-4" />
                                </span>
                            )}

                            <div className="min-w-0">
                                <DialogPrimitive.Title className="text-xs sm:text-[13px] font-mono font-bold uppercase tracking-wider text-slate-900 truncate leading-tight">
                                    {title}
                                </DialogPrimitive.Title>
                                {subtitle && (
                                    <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-slate-500 min-w-0">
                                        {subtitle}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogPrimitive.Close asChild>
                            <button
                                type="button"
                                aria-label={closeLabel}
                                className="btn-icon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shrink-0"
                            >
                                <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </DialogPrimitive.Close>
                    </div>

                    {tabs && tabs.length > 0 && (
                        <div
                            role={isTabList ? "tablist" : "group"}
                            aria-label={tabsAriaLabel ?? title}
                            className={cn(
                                "grid divide-x divide-[var(--color-border-default)] border-b border-[var(--color-border-default)] bg-slate-50/85 shrink-0",
                                gridColsClass
                            )}
                        >
                            {tabs.map((tab, idx) => {
                                const selected = activeTab === tab.key;
                                const isDisabled = Boolean(tab.disabled);
                                const isInteractive = Boolean(onTabChange);

                                const inner = (
                                    <>
                                        <div className="inline-flex items-center justify-center gap-1.5 font-mono text-sm font-bold tabular-nums text-slate-900 leading-tight">
                                            {tab.dotClass && (
                                                <span
                                                    className={cn(
                                                        "w-1.5 h-1.5 rounded-[1px] rotate-45 shrink-0",
                                                        tab.dotClass
                                                    )}
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <span>{tab.count}</span>
                                        </div>
                                        <div
                                            className={cn(
                                                "mt-0.5 text-[10px] font-mono uppercase tracking-wider truncate",
                                                selected
                                                    ? "font-bold text-slate-900"
                                                    : "font-medium text-slate-500"
                                            )}
                                        >
                                            {tab.label}
                                        </div>
                                    </>
                                );

                                if (!isInteractive) {
                                    return (
                                        <div
                                            key={tab.key}
                                            className={cn(
                                                "py-2.5 px-1.5 text-center",
                                                tab.muted && "opacity-60"
                                            )}
                                        >
                                            {inner}
                                        </div>
                                    );
                                }

                                return (
                                    <button
                                        key={tab.key}
                                        id={`${tabIdPrefix}-${tab.key}`}
                                        type="button"
                                        role={isTabList ? "tab" : undefined}
                                        disabled={isDisabled}
                                        aria-selected={isTabList ? selected : undefined}
                                        aria-pressed={!isTabList ? selected : undefined}
                                        aria-controls={isTabList ? tabPanelId : undefined}
                                        tabIndex={isTabList ? (selected ? 0 : -1) : undefined}
                                        onClick={() => onTabChange?.(tab.key)}
                                        onKeyDown={
                                            isTabList
                                                ? (e) => {
                                                      if (
                                                          e.key !== "ArrowRight" &&
                                                          e.key !== "ArrowLeft"
                                                      ) {
                                                          return;
                                                      }
                                                      const enabledTabs = tabs.filter(
                                                          (t) => !t.disabled
                                                      );
                                                      if (enabledTabs.length <= 1) return;
                                                      e.preventDefault();
                                                      const delta = e.key === "ArrowRight" ? 1 : -1;
                                                      let nextIdx = idx;
                                                      for (
                                                          let step = 0;
                                                          step < tabs.length;
                                                          step++
                                                      ) {
                                                          nextIdx =
                                                              (nextIdx + delta + tabs.length) %
                                                              tabs.length;
                                                          if (!tabs[nextIdx].disabled) break;
                                                      }
                                                      const nextKey = tabs[nextIdx].key;
                                                      onTabChange?.(nextKey);
                                                      document
                                                          .getElementById(
                                                              `${tabIdPrefix}-${nextKey}`
                                                          )
                                                          ?.focus();
                                                  }
                                                : undefined
                                        }
                                        className={cn(
                                            "relative py-2.5 px-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400",
                                            isDisabled ? "cursor-default" : "cursor-pointer",
                                            selected
                                                ? "bg-white shadow-[inset_0_-2px_0_0_#0f172a]"
                                                : !isDisabled && "hover:bg-white/80",
                                            tab.muted && "opacity-60"
                                        )}
                                    >
                                        {inner}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {search && (
                        <div className="px-3.5 sm:px-4 py-2 bg-white border-b border-[var(--color-border-default)] shrink-0">
                            <div className="relative flex items-center">
                                <Search
                                    className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none"
                                    aria-hidden="true"
                                />
                                <input
                                    type="search"
                                    value={search.value}
                                    onChange={(e) => search.onChange(e.target.value)}
                                    placeholder={search.placeholder}
                                    aria-label={search.ariaLabel}
                                    className="w-full h-8 pl-8 pr-7 text-xs rounded-md border border-[var(--color-border-default)] bg-slate-50/75 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-border-dark)] focus:bg-white transition-colors [&::-webkit-search-cancel-button]:hidden"
                                />
                                {search.value && (
                                    <button
                                        type="button"
                                        onClick={() => search.onChange("")}
                                        aria-label={search.clearLabel}
                                        className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                    >
                                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div
                        id={isTabList ? tabPanelId : undefined}
                        role={isTabList ? "tabpanel" : undefined}
                        aria-labelledby={
                            isTabList && activeTab ? `${tabIdPrefix}-${activeTab}` : undefined
                        }
                        className={cn(
                            "flex-1 min-h-0 overflow-y-auto overscroll-contain utm-scroll bg-slate-50/85",
                            bodyClassName
                        )}
                    >
                        {children}
                    </div>

                    {footer && (
                        <div className="px-4 sm:px-5 py-2.5 bg-white border-t border-[var(--color-border-default)] flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 shrink-0">
                            {footer}
                        </div>
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
