"use client";

import React from "react";
import { PageHeader } from "../PageHeader";
import { AlertBanner } from "../AlertBanner";
import { cn } from "@/lib";

export interface SplitMapLayoutProps {
    title: string;
    badges?: React.ReactNode;
    headerActions?: React.ReactNode;
    error?: string | null;
    onErrorDismiss?: () => void;
    mapContent: React.ReactNode;
    sidebarContent: React.ReactNode;
    mapSpan?: 7 | 8 | 9;
    className?: string;
}

export function SplitMapLayout({
    title,
    badges,
    headerActions,
    error,
    onErrorDismiss,
    mapContent,
    sidebarContent,
    mapSpan = 8,
    className,
}: SplitMapLayoutProps) {
    const mapColClass =
        mapSpan === 7 ? "xl:col-span-7" : mapSpan === 9 ? "xl:col-span-9" : "xl:col-span-8";

    const sidebarColClass =
        mapSpan === 7 ? "xl:col-span-5" : mapSpan === 9 ? "xl:col-span-3" : "xl:col-span-4";

    return (
        <div className={cn("p-8 flex flex-col gap-6 w-full min-h-[calc(100vh-80px)]", className)}>
            <PageHeader title={title}>
                <div className="flex items-center gap-3">
                    {badges}
                    {headerActions}
                </div>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={onErrorDismiss || (() => {})} />}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full flex-1 min-h-[680px]">
                <div className={cn(mapColClass, "flex flex-col h-full min-h-[580px]")}>
                    {mapContent}
                </div>
                <div className={cn(sidebarColClass, "flex flex-col h-full min-h-[580px]")}>
                    {sidebarContent}
                </div>
            </div>
        </div>
    );
}

export default SplitMapLayout;
