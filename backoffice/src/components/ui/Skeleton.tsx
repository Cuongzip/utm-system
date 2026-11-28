"use client";

import { cn } from "@/lib";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            aria-hidden="true"
            className={cn("animate-pulse rounded bg-slate-200/75", className)}
        />
    );
}

export function PageEditorSkeleton() {
    return (
        <div
            role="status"
            aria-busy="true"
            aria-label="Loading workspace"
            className="p-6 xl:p-8 flex flex-col gap-4 xl:gap-6 w-full min-h-[calc(100vh-80px)] xl:h-[calc(100vh-80px)] xl:min-h-[680px]"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-56 rounded" />
                    <Skeleton className="h-5 w-20 rounded" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-24 rounded" />
                    <Skeleton className="h-8 w-32 rounded" />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full flex-1 min-h-[600px] xl:min-h-0">
                <div className="xl:col-span-8 rounded-md border border-[var(--color-border-default)] bg-slate-200/60 animate-pulse h-full min-h-[480px] xl:min-h-0" />
                <div className="xl:col-span-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] p-5 flex flex-col gap-4 h-full min-h-[480px] xl:min-h-0">
                    <div className="flex gap-3 border-b border-[var(--color-border-subtle)] pb-3">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-9 w-full" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-9 w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>
            <span className="sr-only">Loading workspace...</span>
        </div>
    );
}
