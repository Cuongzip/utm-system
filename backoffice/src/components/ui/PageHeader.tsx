"use client";

import React from "react";

export interface PageHeaderProps {
    title: string | React.ReactNode;
    badges?: React.ReactNode;
    children?: React.ReactNode;
}

export function PageHeader({ title, badges, children }: PageHeaderProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
                <h1 className="text-xl sm:text-[24px] font-bold text-[#0f172a] tracking-[-0.5px] sm:tracking-[-0.6px] leading-tight sm:leading-[32px] break-words">
                    {title}
                </h1>
                {badges && <div className="flex items-center gap-2 flex-wrap">{badges}</div>}
            </div>

            {children && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">{children}</div>
            )}
        </div>
    );
}
