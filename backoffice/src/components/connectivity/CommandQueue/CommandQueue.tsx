"use client";

import { AlignLeft } from "lucide-react";
import { ChamferCard, EmptyState } from "@/components/ui";

interface CommandQueueProps {
    latency?: string;
    pendingCount?: number;
    byPriority?: Record<number, number>;
}

export function CommandQueue({
    latency = "0ms",
    pendingCount = 0,
    byPriority = { 0: 0, 1: 0, 2: 0, 3: 0 },
}: CommandQueueProps) {
    return (
        <ChamferCard size="lg" accent="dark" className="h-[222px]">
            <div className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between w-full pl-2">
                    <h2 className="text-[12px] font-bold uppercase text-[var(--color-text-primary)] tracking-[0.6px] leading-4">
                        COMMAND QUEUE
                    </h2>
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)] leading-[15px]">
                        LATENCY: {latency}
                    </span>
                </div>

                <div className="pt-3 w-full">
                    {pendingCount === 0 ? (
                        <div className="border border-dashed border-[var(--color-border-default)] rounded-md py-6 px-4 flex flex-col items-center justify-center w-full">
                            <EmptyState
                                icon={AlignLeft}
                                title={`Queue is idle - ${pendingCount} instructions pending`}
                                compact
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                            <div className="bg-[var(--color-surface-base)] border border-[var(--color-border-default)] rounded p-2 flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                                    P0 Emergency
                                </span>
                                <span className="font-mono text-lg font-bold text-[var(--color-text-primary)]">
                                    {byPriority[0] || 0}
                                </span>
                            </div>
                            <div className="bg-[var(--color-surface-base)] border border-[var(--color-border-default)] rounded p-2 flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                                    P1 High
                                </span>
                                <span className="font-mono text-lg font-bold text-[var(--color-text-primary)]">
                                    {byPriority[1] || 0}
                                </span>
                            </div>
                            <div className="bg-[var(--color-surface-base)] border border-[var(--color-border-default)] rounded p-2 flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                                    P2 Normal
                                </span>
                                <span className="font-mono text-lg font-bold text-[var(--color-text-primary)]">
                                    {byPriority[2] || 0}
                                </span>
                            </div>
                            <div className="bg-[var(--color-surface-base)] border border-[var(--color-border-default)] rounded p-2 flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                                    P3 Background
                                </span>
                                <span className="font-mono text-lg font-bold text-[var(--color-text-primary)]">
                                    {byPriority[3] || 0}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ChamferCard>
    );
}

export default CommandQueue;
