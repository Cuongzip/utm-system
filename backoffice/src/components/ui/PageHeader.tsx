"use client";

import React from "react";

export interface PageHeaderProps {
    title: string | React.ReactNode;
    badges?: React.ReactNode;
    children?: React.ReactNode;
}

export function PageHeader({ title, badges, children }: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
                <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px] leading-[32px]">
                    {title}
                </h1>
                {badges && <div className="flex items-center">{badges}</div>}
            </div>

            {children && <div className="flex items-center gap-3">{children}</div>}
        </div>
    );
}
