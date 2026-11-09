"use client";

import React from "react";
import { X } from "lucide-react";
import { Tooltip } from "@/components/ui";

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
}

export function MapInspector({ code, title, badge, metaItems = [], onClose }: MapInspectorProps) {
    return (
        <div className="absolute bottom-4 left-4 right-4 z-30 chamfer-sm p-[1px] shadow-2xl transition-all duration-200 bg-slate-600/45">
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
                                    <span className="font-mono uppercase text-slate-400 font-medium">
                                        {item.label}:
                                    </span>
                                    <span className="font-mono text-slate-100 font-bold">
                                        {item.value}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <Tooltip content="Close inspector" side="left">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                        aria-label="Close inspector"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}
