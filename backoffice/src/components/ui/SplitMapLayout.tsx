"use client";

import React from "react";
import { PageHeader } from "./PageHeader";
import { cn } from "@/lib";

export interface SplitMapLayoutProps {
    title: string | React.ReactNode;
    badges?: React.ReactNode;
    headerActions?: React.ReactNode;
    mapContent: React.ReactNode;
    sidebarContent: React.ReactNode;
    className?: string;
}

export function SplitMapLayout({
    title,
    badges,
    headerActions,
    mapContent,
    sidebarContent,
    className,
}: SplitMapLayoutProps) {
    return (
        <div
            className={cn(
                "p-6 xl:p-8 flex flex-col gap-4 xl:gap-6 w-full min-h-[calc(100vh-80px)] xl:h-[calc(100vh-80px)] xl:min-h-[680px]",
                className
            )}
        >
            <PageHeader title={title} badges={badges}>
                {headerActions}
            </PageHeader>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full flex-1 min-h-[600px] xl:min-h-0">
                <div className="xl:col-span-8 flex flex-col h-full min-h-[480px] xl:min-h-0">
                    {mapContent}
                </div>
                <div className="xl:col-span-4 flex flex-col h-full min-h-[480px] xl:min-h-0 overflow-hidden">
                    {sidebarContent}
                </div>
            </div>
        </div>
    );
}
