"use client";

import React from "react";
import { X } from "lucide-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib";

export interface MapInspectorMetaItem {
    label: string;
    value: React.ReactNode;
}

export interface MapInspectorProps {
    code?: string;
    title?: React.ReactNode;
    badge?: React.ReactNode;
    metaItems?: MapInspectorMetaItem[];
    onClose: () => void;
    closeTooltip?: string;
    accentColor?: "cyan" | "default" | "amber" | "red";
    className?: string;
    children?: React.ReactNode;
}

const ACCENT_CLASS_MAP: Record<NonNullable<MapInspectorProps["accentColor"]>, string> = {
    cyan: "bg-slate-600/55",
    default: "bg-slate-600/45",
    amber: "bg-amber-500/35",
    red: "bg-red-500/35",
};

export function MapInspector({
    code,
    title,
    badge,
    metaItems = [],
    onClose,
    closeTooltip = "Close inspector",
    accentColor = "default",
    className,
    children,
}: MapInspectorProps) {
    const accentClass = ACCENT_CLASS_MAP[accentColor] || ACCENT_CLASS_MAP.default;

    return (
        <div
            className={cn(
                "absolute bottom-4 left-4 right-4 z-30 chamfer-sm p-[1px] shadow-2xl transition-all duration-200",
                accentClass,
                className
            )}
        >
            <div className="chamfer-sm bg-slate-900/95 backdrop-blur-md px-4 py-2.5 text-white flex items-center justify-between gap-4 relative">
                <div className="flex flex-col gap-1 min-w-0">
                    {(code || title || badge) && (
                        <div className="text-[13.5px] font-bold flex items-center gap-2.5 flex-wrap">
                            {code && (
                                <span className="font-mono text-slate-300 tracking-wide font-semibold">
                                    {code}
                                </span>
                            )}
                            {title && <span className="text-slate-200 font-semibold">{title}</span>}
                            {badge}
                        </div>
                    )}

                    {metaItems.length > 0 && (
                        <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
                            {metaItems.map((item, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1.5">
                                    <span>{item.label}:</span>
                                    <span className="text-slate-100 font-mono font-semibold">
                                        {item.value}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}

                    {children}
                </div>

                <Tooltip content={closeTooltip} side="left">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 p-1 flex items-center justify-center cursor-pointer bg-transparent border-none hover:text-white transition-colors shrink-0"
                        aria-label={closeTooltip}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}

export default MapInspector;
