"use client";

import React from "react";
import { PageHeader } from "./PageHeader";

export interface SplitMapLayoutProps {
    title: string | React.ReactNode;
    badges: React.ReactNode;
    headerActions: React.ReactNode;
    mapContent: React.ReactNode;
    sidebarContent: React.ReactNode;
}

export function SplitMapLayout({
    title,
    badges,
    headerActions,
    mapContent,
    sidebarContent,
}: SplitMapLayoutProps) {
    return (
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 w-full flex-1 xl:h-full xl:min-h-[620px] xl:overflow-hidden">
            <PageHeader title={title} badges={badges}>
                {headerActions}
            </PageHeader>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 w-full flex-1 min-h-[560px] xl:min-h-0">
                <div className="xl:col-span-8 flex flex-col h-full min-h-[460px] xl:min-h-0">
                    {mapContent}
                </div>
                <div className="xl:col-span-4 flex flex-col h-full min-h-[460px] xl:min-h-0 overflow-hidden">
                    {sidebarContent}
                </div>
            </div>
        </div>
    );
}
