"use client";

import React from "react";
import { ChamferCard } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface MapCardLayoutProps {
    title: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode | string;
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
}

export function MapCardLayout({
    title,
    icon,
    badge,
    children,
    className,
    contentClassName,
}: MapCardLayoutProps) {
    return (
        <ChamferCard size="lg" accent="dark" className={cn("w-full h-full", className)}>
            <div className="relative w-full h-full min-h-[520px] flex flex-col overflow-hidden bg-[var(--color-surface-panel)]">
                <div className="px-[18px] py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-surface-panel)] z-10">
                    <div className="text-[13px] font-bold text-[var(--color-text-primary)] flex items-center gap-2 tracking-[-0.2px]">
                        {icon}
                        <span>{title}</span>
                    </div>
                    {badge &&
                        (typeof badge === "string" ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700 text-xs font-mono font-medium">
                                {badge}
                            </span>
                        ) : (
                            badge
                        ))}
                </div>

                <div
                    className={cn(
                        "relative flex-1 w-full h-full min-h-[460px] overflow-hidden",
                        contentClassName
                    )}
                >
                    {children}
                </div>
            </div>
        </ChamferCard>
    );
}

export default MapCardLayout;
