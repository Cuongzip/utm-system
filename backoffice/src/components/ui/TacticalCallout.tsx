"use client";

import React from "react";
import { cn } from "@/lib";

export type TacticalCalloutTone = "info" | "warning" | "critical" | "success";

export interface TacticalCalloutProps {
    tone?: TacticalCalloutTone;
    icon?: React.ComponentType<{ className?: string }>;
    title?: React.ReactNode;
    description?: React.ReactNode;
    rightSlot?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}

const TONE_BORDER_CLASSES: Record<TacticalCalloutTone, string> = {
    info: "border-l-slate-600",
    warning: "border-l-amber-500",
    critical: "border-l-red-600",
    success: "border-l-emerald-600",
};

const TONE_ICON_CLASSES: Record<TacticalCalloutTone, string> = {
    info: "text-slate-600",
    warning: "text-amber-600",
    critical: "text-red-600",
    success: "text-emerald-600",
};

export function TacticalCallout({
    tone = "info",
    icon: Icon,
    title,
    description,
    rightSlot,
    children,
    className,
}: TacticalCalloutProps) {
    return (
        <div
            className={cn(
                "w-full rounded-r-md border border-[var(--color-border-default)] border-l-[3px] bg-[var(--color-surface-subtle)] px-3.5 py-2.5 flex flex-col gap-2",
                TONE_BORDER_CLASSES[tone],
                className
            )}
        >
            {(title || description || rightSlot || Icon) && (
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {Icon && (
                            <Icon
                                className={cn("w-4 h-4 shrink-0 mt-0.5", TONE_ICON_CLASSES[tone])}
                                aria-hidden="true"
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            {title && (
                                <div className="text-xs font-semibold text-[var(--color-text-primary)] leading-snug">
                                    {title}
                                </div>
                            )}
                            {description && (
                                <div className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
                                    {description}
                                </div>
                            )}
                        </div>
                    </div>
                    {rightSlot && (
                        <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>
                    )}
                </div>
            )}
            {children}
        </div>
    );
}
