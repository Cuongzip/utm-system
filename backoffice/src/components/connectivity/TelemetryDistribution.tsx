"use client";

import { ChamferCard } from "@/components/ui";
import type { TelemetryModeConfig } from "@/types";

export interface TelemetryDistributionProps {
    frequencyBand?: string;
    byMode: Record<string, number>;
    modeConfigs?: TelemetryModeConfig[];
}

const TELEMETRY_DISTRIBUTION_MODES = [
    { id: "idle", label: "Idle", fallbackRate: "0.033 Hz" },
    { id: "normal", label: "Normal", fallbackRate: "0.5 Hz" },
    { id: "enhanced", label: "Enhanced", fallbackRate: "2 Hz" },
    { id: "emergency", label: "Emergency", fallbackRate: "10 Hz" },
] as const;

export function TelemetryDistribution({
    frequencyBand = "ADAPTIVE",
    byMode = { idle: 0, normal: 0, enhanced: 0, emergency: 0 },
    modeConfigs = [],
}: TelemetryDistributionProps) {
    const rateByMode = new Map<string, string>(
        modeConfigs
            .filter((c) => Boolean(c.mode) && c.rateHz != null)
            .map((c) => [c.mode!, `${c.rateHz} Hz`])
    );

    return (
        <ChamferCard size="sm" className="w-full">
            <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700">
                        Telemetry Rate Allocation
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">· {frequencyBand}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono">
                    {TELEMETRY_DISTRIBUTION_MODES.map((mode) => {
                        const rate = rateByMode.get(mode.id) ?? mode.fallbackRate;
                        const count = byMode[mode.id] ?? 0;
                        return (
                            <div key={mode.id} className="flex items-center gap-1.5">
                                <span className="text-slate-500">{mode.label}</span>
                                <span className="text-[10px] text-slate-400">({rate})</span>
                                <span className="font-bold text-slate-900 tabular-nums">
                                    {count}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ChamferCard>
    );
}
