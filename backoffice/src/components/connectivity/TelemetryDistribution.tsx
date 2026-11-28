"use client";

import { useTranslations } from "next-intl";
import { ChamferCard } from "@/components/ui";
import { TELEMETRY_MODES, type TelemetryMode, type TelemetryModeConfig } from "@/types";

interface TelemetryDistributionProps {
    frequencyBand?: string;
    byMode: Record<string, number>;
    modeConfigs?: TelemetryModeConfig[];
}

const FALLBACK_RATES: Record<TelemetryMode, string> = {
    idle: "0.033 Hz",
    normal: "0.5 Hz",
    enhanced: "2 Hz",
    emergency: "10 Hz",
};

const DEFAULT_BY_MODE: Record<string, number> = {
    idle: 0,
    normal: 0,
    enhanced: 0,
    emergency: 0,
};

const EMPTY_MODE_CONFIGS: TelemetryModeConfig[] = [];

export function TelemetryDistribution({
    frequencyBand,
    byMode = DEFAULT_BY_MODE,
    modeConfigs = EMPTY_MODE_CONFIGS,
}: TelemetryDistributionProps) {
    const t = useTranslations("connectivity.distribution");
    const tModes = useTranslations("connectivity.modes");
    const resolvedBand = frequencyBand ?? t("adaptive");

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
                        {t("heading")}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">· {resolvedBand}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono">
                    {TELEMETRY_MODES.map((modeId) => {
                        const rate = rateByMode.get(modeId) ?? FALLBACK_RATES[modeId];
                        const count = byMode[modeId] ?? 0;
                        return (
                            <div key={modeId} className="flex items-center gap-1.5">
                                <span className="text-slate-500">{tModes(modeId)}</span>
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
