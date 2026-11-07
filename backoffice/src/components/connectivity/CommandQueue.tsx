"use client";

import { AlignLeft } from "lucide-react";
import { ChamferCard, EmptyState } from "@/components/ui";

export interface CommandQueueProps {
    latency?: string;
    pendingCount?: number;
    byPriority?: Record<number, number>;
}

const PRIORITY_LEVELS = [
    { level: 0, label: "P0 Emergency" },
    { level: 1, label: "P1 High" },
    { level: 2, label: "P2 Normal" },
    { level: 3, label: "P3 Background" },
] as const;

export function CommandQueue({
    latency = "0ms",
    pendingCount = 0,
    byPriority = { 0: 0, 1: 0, 2: 0, 3: 0 },
}: CommandQueueProps) {
    return (
        <ChamferCard size="lg" className="h-[222px]">
            <div className="p-5 flex flex-col justify-between flex-1 w-full">
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
                            {PRIORITY_LEVELS.map(({ level, label }) => (
                                <div
                                    key={level}
                                    className="bg-[var(--color-surface-base)] border border-[var(--color-border-default)] rounded p-2 flex flex-col gap-1"
                                >
                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                                        {label}
                                    </span>
                                    <span className="font-mono text-lg font-bold text-[var(--color-text-primary)]">
                                        {byPriority[level] ?? 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ChamferCard>
    );
}
