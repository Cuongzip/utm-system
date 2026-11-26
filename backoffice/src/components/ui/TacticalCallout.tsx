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

const TONE_ICON_CLASSES: Record<TacticalCalloutTone, string> = {
    info: "text-slate-500",
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
    const isSingleLine = !description && !children;

    return (
        <div
            className={cn(
                "w-full shrink-0 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] px-3.5 py-2.5 flex flex-col gap-2",
                className
            )}
        >
            {(title || description || rightSlot || Icon) && (
                <div
                    className={cn(
                        "flex flex-wrap justify-between gap-2.5",
                        isSingleLine ? "items-center" : "items-start"
                    )}
                >
                    <div
                        className={cn(
                            "flex gap-2.5 min-w-0 flex-1",
                            isSingleLine ? "items-center" : "items-start"
                        )}
                    >
                        {Icon && (
                            <Icon
                                className={cn(
                                    "w-4 h-4 shrink-0",
                                    !isSingleLine && "mt-0.5",
                                    TONE_ICON_CLASSES[tone]
                                )}
                                aria-hidden="true"
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            {title && (
                                <div className="text-xs font-medium text-[var(--color-text-primary)] leading-snug">
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
