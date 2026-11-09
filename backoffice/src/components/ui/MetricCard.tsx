"use client";

import React, { isValidElement } from "react";
import { cn } from "@/lib";
import { ChamferCard } from "./ChamferCard";

export interface MetricCardProps {
    title: string;
    value: string | number;
    subValue?: React.ReactNode;
    subValuePosition?: "inline" | "bottom";
    icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
    iconClassName?: string;
    children?: React.ReactNode;
}

export function MetricCard({
    title,
    value,
    subValue,
    subValuePosition = "inline",
    icon,
    iconClassName,
    children,
}: MetricCardProps) {
    const renderIcon = () => {
        if (!icon) return null;
        if (isValidElement(icon)) return icon;
        const IconComponent = icon as React.ComponentType<{ className?: string }>;
        return <IconComponent className={cn("w-4 h-4 text-[#64748b]", iconClassName)} />;
    };

    return (
        <ChamferCard size="md" className="h-[119px]">
            <div className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-bold text-[#64748b] tracking-[0.55px] uppercase font-mono">
                        {title}
                    </span>
                    {icon && (
                        <div className="shrink-0 flex items-center justify-center">
                            {renderIcon()}
                        </div>
                    )}
                </div>

                {subValuePosition === "inline" ? (
                    <div className="flex flex-col gap-1 mt-auto">
                        <div className="flex items-baseline gap-2">
                            <span className="font-mono text-[30px] font-bold text-[#0f172a] tracking-[-0.75px] leading-none">
                                {value}
                            </span>
                            {subValue && (
                                <span className="text-[11px] font-mono font-bold text-[#94a3b8] tracking-wider uppercase">
                                    {subValue}
                                </span>
                            )}
                        </div>
                        {children}
                    </div>
                ) : (
                    <div className="flex flex-col gap-0.5 mt-auto">
                        <span className="font-mono text-[30px] font-bold text-[#0f172a] tracking-[-0.75px] leading-9">
                            {value}
                        </span>
                        {subValue && (
                            <span className="text-[11px] text-[#94a3b8] font-medium">
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
