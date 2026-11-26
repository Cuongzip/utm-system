"use client";

import React from "react";
import { cn } from "@/lib";
import { ChamferCard } from "./ChamferCard";
import { Skeleton } from "./Skeleton";

export interface MetricCardProps {
    title: string;
    value: string | number;
    subValue?: React.ReactNode;
    subValuePosition?: "inline" | "bottom";
    loading?: boolean;
    icon?: React.ComponentType<{ className?: string }>;
    iconClassName?: string;
    cardClassName?: string;
    innerClassName?: string;
    children?: React.ReactNode;
}

export function MetricCard({
    title,
    value,
    subValue,
    subValuePosition = "inline",
    loading = false,
    icon: IconComponent,
    iconClassName,
    cardClassName,
    innerClassName,
    children,
}: MetricCardProps) {
    return (
        <ChamferCard
            size="md"
            className={cn("min-h-[96px]", cardClassName)}
            innerClassName={innerClassName}
        >
            <div className="px-4 py-3.5 flex flex-col justify-between gap-2 h-full">
                <div className="flex items-center justify-between w-full gap-2">
                    <span className="text-[11px] font-bold text-[var(--color-text-secondary)] tracking-[0.55px] uppercase font-mono truncate">
                        {title}
                    </span>
                    {IconComponent && (
                        <div className="shrink-0 flex items-center justify-center">
                            <IconComponent
                                className={cn(
                                    "w-4 h-4 text-[var(--color-text-muted)]",
                                    iconClassName
                                )}
                            />
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col gap-2 mt-auto" aria-busy="true">
                        <Skeleton className="h-7 w-16" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                ) : subValuePosition === "inline" ? (
                    <div className="flex flex-col gap-1.5 mt-auto">
                        <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-mono text-2xl font-bold text-[var(--color-text-primary)] tabular-nums tracking-tight leading-none">
                                {value}
                            </span>
                            {subValue && (
                                <span className="text-[11px] font-mono font-semibold text-[var(--color-text-muted)] tracking-wider uppercase">
                                    {subValue}
                                </span>
                            )}
                        </div>
                        {children}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 mt-auto">
                        <span className="font-mono text-2xl font-bold text-[var(--color-text-primary)] tabular-nums tracking-tight leading-tight">
                            {value}
                        </span>
                        {subValue && (
                            <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                                {subValue}
                            </span>
                        )}
                        {children}
                    </div>
                )}
            </div>
        </ChamferCard>
    );
}
