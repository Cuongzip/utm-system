"use client";

import React from "react";
import { cn } from "@/lib";
import { OutlineButton } from "./OutlineButton";

export interface EmptyStateProps {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: React.ComponentType<{ className?: string }>;
    };
    children?: React.ReactNode;
    className?: string;
    compact?: boolean;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    children,
    className,
    compact = false,
}: EmptyStateProps) {
    const ActionIcon = action?.icon;

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center text-center w-full select-none",
                compact ? "py-4 px-2" : "py-10 px-4",
                className
            )}
        >
            {Icon && (
                <div
                    className={cn(
                        "rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-2xs",
                        compact ? "w-8 h-8 mb-2" : "w-11 h-11 mb-3"
                    )}
                >
                    <Icon
                        className={compact ? "w-4 h-4 text-slate-500" : "w-5 h-5 text-slate-500"}
                    />
                </div>
            )}
            <h3
                className={cn(
                    "font-semibold font-mono text-slate-700",
                    compact ? "text-xs" : "text-sm"
                )}
            >
                {title}
            </h3>
            {description && (
                <p
                    className={cn(
                        "text-slate-400 font-mono mt-1 max-w-sm",
                        compact ? "text-[10px] leading-relaxed" : "text-xs"
                    )}
                >
                    {description}
                </p>
            )}
            {action && (
                <OutlineButton
                    size="sm"
                    onClick={action.onClick}
                    className="mt-3.5 inline-flex items-center gap-1.5 font-mono text-xs cursor-pointer"
                >
                    {ActionIcon && <ActionIcon className="w-3.5 h-3.5 text-slate-600" />}
                    <span>{action.label}</span>
                </OutlineButton>
            )}
            {children}
        </div>
    );
}

export default EmptyState;
