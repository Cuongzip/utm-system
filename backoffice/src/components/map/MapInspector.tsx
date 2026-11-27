"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib";

export interface MapInspectorMetaItem {
    label: string;
    value: React.ReactNode;
    subValue?: React.ReactNode;
}

export interface MapInspectorProps {
    code?: string;
    title?: React.ReactNode;
    badge?: React.ReactNode;
    metaItems?: MapInspectorMetaItem[];
    actions?: React.ReactNode;
    onClose: () => void;
}

export function MapInspector({
    code,
    title,
    badge,
    metaItems = [],
    actions,
    onClose,
}: MapInspectorProps) {
    const t = useTranslations("map");
    const gridClass =
        metaItems.length === 3
            ? "grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1fr)]"
            : metaItems.length === 2
              ? "grid-cols-2"
              : metaItems.length >= 4
                ? "grid-cols-2 sm:grid-cols-4"
                : "grid-cols-1";

    return (
        <div className="absolute bottom-3 left-3 right-3 z-30 chamfer-sm p-[1px] bg-slate-700/80 shadow-xl">
            <div className="chamfer-sm bg-slate-900/92 backdrop-blur-md text-slate-100 flex flex-col">
                {(code || title || badge || actions) && (
                    <div className="px-3.5 py-2.5 flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                            {(code || badge) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {code && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-semibold text-white tracking-wide leading-none">
                                            {code}
                                        </span>
                                    )}
                                    {badge}
                                </div>
                            )}
                            {title && (
                                <span className="text-[13px] font-semibold text-slate-100 leading-snug truncate">
                                    {title}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {actions}
                            <Tooltip content={t("closeInspector")} side="left">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors cursor-pointer shrink-0"
                                    aria-label={t("closeInspector")}
                                >
                                    <X className="w-4 h-4" aria-hidden="true" />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                )}

                {metaItems.length > 0 && (
                    <div className="border-t border-slate-800 px-3.5 py-2.5">
                        <div className={cn("grid divide-x divide-slate-800/90", gridClass)}>
                            {metaItems.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="px-3 first:pl-0 last:pr-0 flex flex-col gap-0.5 min-w-0"
                                >
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 leading-tight truncate">
                                        {item.label}
                                    </span>
                                    <span className="text-xs font-mono font-semibold text-white tabular-nums truncate">
                                        {item.value}
                                    </span>
                                    {item.subValue && (
                                        <span className="text-[11px] font-mono text-slate-400 tabular-nums truncate">
                                            {item.subValue}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
