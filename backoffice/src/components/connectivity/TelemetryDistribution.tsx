"use client";

import { PieChart } from "lucide-react";
import { ChamferCard, EmptyState } from "@/components/ui";

export interface TelemetryDistributionProps {
    frequencyBand?: string;
    hasFeeds?: boolean;
    byMode?: Record<string, number>;
}

const TELEMETRY_DISTRIBUTION_MODES = [
    { id: "idle", label: "Idle (1 Hz)" },
    { id: "normal", label: "Normal (5 Hz)" },
    { id: "enhanced", label: "Enhanced (20 Hz)" },
    { id: "emergency", label: "Emergency (50 Hz)" },
] as const;

export function TelemetryDistribution({
    frequencyBand = "DUAL-BAND",
    hasFeeds = false,
    byMode = { idle: 0, normal: 0, enhanced: 0, emergency: 0 },
}: TelemetryDistributionProps) {
    const totalFeeds = Object.values(byMode).reduce((sum, v) => sum + (v ?? 0), 0);
    const showActive = hasFeeds || totalFeeds > 0;

    return (
        <ChamferCard size="lg" className="h-[222px]">
            <div className="p-5 flex flex-col justify-between flex-1 w-full">
                <div className="flex items-center justify-between w-full pl-2">
                    <h2 className="text-[12px] font-bold uppercase text-[var(--color-text-primary)] tracking-[0.6px] leading-4">
                        TELEMETRY DISTRIBUTION
                    </h2>
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)] leading-[15px]">
                        FREQ: {frequencyBand}
                    </span>
                </div>

                <div className="pt-3 w-full">
                    {!showActive ? (
                        <div className="border border-dashed border-[var(--color-border-default)] rounded-md py-6 px-4 flex flex-col items-center justify-center w-full">
                            <EmptyState
                                icon={PieChart}
                                title="No active telemetry feeds recorded"
                                compact
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 w-full">
                            {TELEMETRY_DISTRIBUTION_MODES.map((mode) => (
                                <div
                                    key={mode.id}
                                    className="bg-[var(--color-surface-base)] border border-[var(--color-border-default)] rounded p-2.5 flex flex-col gap-1"
                                >
                                    <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase">
                                        {mode.label}
                                    </span>
                                    <span className="font-mono text-lg font-bold text-[var(--color-text-primary)]">
                                        {byMode[mode.id] ?? 0}
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
