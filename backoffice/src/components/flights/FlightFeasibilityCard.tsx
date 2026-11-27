"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/ui";
import { useFlightFeasibility } from "@/hooks";
import { formatDistance } from "@/utils";
import { FEASIBILITY_VERDICT, type Drone, type FeasibilityVerdict } from "@/types";
import { estimateRouteFeasibility } from "./flightUtils";

export interface FlightFeasibilityCardProps {
    flightId?: string;
    distanceM: number;
    drone: Drone | null;
    overrideReason?: string;
}

export function FlightFeasibilityCard({
    flightId,
    distanceM = 0,
    drone = null,
    overrideReason,
}: FlightFeasibilityCardProps) {
    const t = useTranslations("flights.feasibility");
    const { data: liveResult } = useFlightFeasibility(flightId, Boolean(flightId) && distanceM > 0);

    const localEstimate = useMemo(() => {
        return estimateRouteFeasibility(distanceM, drone);
    }, [distanceM, drone]);

    if (distanceM <= 0) {
        return null;
    }

    const requiredWh = liveResult?.requiredWh ?? localEstimate.requiredWh;
    const usableWh = liveResult?.usableWh ?? localEstimate.usableWh;
    const marginPct = liveResult?.marginPct ?? localEstimate.marginPct;
    const rawVerdict = liveResult?.verdict;
    const verdict: FeasibilityVerdict =
        rawVerdict === FEASIBILITY_VERDICT.GO || rawLiveVerdictIsMarginalOrNoGo(rawVerdict)
            ? rawVerdict
            : localEstimate.verdict;
    const estimatedDurationMin = localEstimate.estimatedDurationMin;
    const windSpeedMs = liveResult?.windUsed?.speedMs;
    const solutions = liveResult?.solutions ?? [];

    const energyPct = usableWh > 0 ? Math.min(100, Math.round((requiredWh / usableWh) * 100)) : 100;
    const trimmedOverride = overrideReason?.trim();

    const barColorClass =
        verdict === FEASIBILITY_VERDICT.NO_GO
            ? "bg-red-500"
            : verdict === FEASIBILITY_VERDICT.MARGINAL
              ? "bg-amber-500"
              : "bg-slate-700";

    return (
        <div className="p-3 border border-[var(--color-border-default)] rounded-md bg-[var(--color-surface-subtle)] text-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    {t("title")}
                </span>
                <StatusBadge
                    status={verdict}
                    label={
                        verdict === FEASIBILITY_VERDICT.GO
                            ? t("feasible")
                            : verdict === FEASIBILITY_VERDICT.MARGINAL
                              ? t("marginal")
                              : t("noGo")
                    }
                />
            </div>

            <div className="grid grid-cols-3 divide-x divide-[var(--color-border-default)] py-1.5 font-mono text-[11px] border-t border-b border-[var(--color-border-default)] text-[var(--color-text-secondary)]">
                <div className="pr-2">
                    <span className="text-[var(--color-text-muted)] text-[10px] uppercase block">
                        {t("distance")}
                    </span>
                    <span className="font-bold text-[var(--color-text-primary)] tabular-nums">
                        {formatDistance(distanceM, 2)}
                    </span>
                </div>
                <div className="px-2">
                    <span className="text-[var(--color-text-muted)] text-[10px] uppercase block">
                        {t("estTime")}
                    </span>
                    <span className="font-bold text-[var(--color-text-primary)] tabular-nums">
                        {t("minutesShort", { count: estimatedDurationMin })}
                    </span>
                </div>
                <div className="pl-2">
                    <span className="text-[var(--color-text-muted)] text-[10px] uppercase block">
                        {t("margin")}
                    </span>
                    <span className="font-bold text-[var(--color-text-primary)] tabular-nums">
                        {marginPct >= 0 ? `+${marginPct.toFixed(1)}%` : `${marginPct.toFixed(1)}%`}
                    </span>
                </div>
            </div>

            <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[10px] text-[var(--color-text-muted)] tabular-nums">
                    <span>
                        {t("energyUsage", {
                            required: Math.round(requiredWh),
                            usable: Math.round(usableWh),
                        })}
                    </span>
                    {windSpeedMs != null && (
                        <span>{t("wind", { speed: windSpeedMs.toFixed(1) })}</span>
                    )}
                </div>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${barColorClass}`}
                        style={{ width: `${Math.min(100, energyPct)}%` }}
                    />
                </div>
            </div>

            {verdict !== FEASIBILITY_VERDICT.GO && solutions.length > 0 && (
                <ul className="space-y-1 pt-1.5 border-t border-[var(--color-border-default)] text-[11px] text-slate-600">
                    {solutions.slice(0, 2).map((sol, idx) => (
                        <li key={idx}>
                            <span className="font-semibold text-slate-800">{sol.label}: </span>
                            <span>{sol.detail}</span>
                        </li>
                    ))}
                </ul>
            )}

            {trimmedOverride && (
                <div className="pt-2 border-t border-[var(--color-border-default)]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] block">
                        {t("overrideNote")}
                    </span>
                    <p className="text-[11px] font-mono text-[var(--color-text-primary)] mt-0.5 leading-relaxed">
                        {trimmedOverride}
                    </p>
                </div>
            )}
        </div>
    );
}

function rawLiveVerdictIsMarginalOrNoGo(
    v: string | undefined
): v is typeof FEASIBILITY_VERDICT.MARGINAL | typeof FEASIBILITY_VERDICT.NO_GO {
    return v === FEASIBILITY_VERDICT.MARGINAL || v === FEASIBILITY_VERDICT.NO_GO;
}
