"use client";

import React from "react";
import { cn } from "@/lib";

export interface PageHeaderProps {
    title: string | React.ReactNode;
    subtitle?: string;
    badges?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, subtitle, badges, children, className }: PageHeaderProps) {
    return (
        <div className={cn("flex items-center justify-between w-full", className)}>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px] leading-[32px]">
                        {title}
                    </h1>
                    {badges && <div className="flex items-center">{badges}</div>}
                </div>
                {subtitle && (
                    <p className="text-[13px] text-[#64748b] font-normal mt-0.5">{subtitle}</p>
                )}
            </div>

            {children && <div className="flex items-center gap-3">{children}</div>}
        </div>
    );
}

export default PageHeader;
