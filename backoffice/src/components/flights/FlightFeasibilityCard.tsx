"use client";

import { useMemo } from "react";
import { Zap, Info } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import type { Drone } from "@/types";
import { estimateRouteFeasibility } from "./flightUtils";

export interface FlightFeasibilityCardProps {
    initialOverride?: string;
    distanceM?: number;
    drone?: Drone | null;
    className?: string;
}

export function FlightFeasibilityCard({
    initialOverride,
    distanceM = 0,
    drone = null,
    className = "",
}: FlightFeasibilityCardProps) {
    const { requiredWh, usableWh, marginPct, verdict, estimatedDurationMin } = useMemo(() => {
        return estimateRouteFeasibility(distanceM, drone);
    }, [distanceM, drone]);

    if (distanceM <= 0) {
        return (
            <div className={`pt-2 ${className}`}>
                <div className="p-3 border border-dashed border-[var(--color-border-default)] rounded-md bg-[var(--color-surface-card)]/50 text-xs">
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                        <Info className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span>
                            Select vertiports or place waypoints to evaluate route feasibility.
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    const energyPct = usableWh > 0 ? Math.min(100, Math.round((requiredWh / usableWh) * 100)) : 100;

    return (
        <div className={`pt-2 space-y-2 ${className}`}>
            <div className="p-3 border border-[var(--color-border-default)] rounded-md bg-[var(--color-surface-card)]/70 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text-primary)]">
                        <Zap className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Route Feasibility</span>
                    </div>
                    <StatusBadge
                        status={verdict}
                        label={
                            verdict === "go"
                                ? "FEASIBLE"
                                : verdict === "marginal"
                                  ? "MARGINAL"
                                  : "NO GO"
                        }
                    />
                </div>

                <div className="grid grid-cols-3 gap-2 py-1.5 font-mono text-[11px] border-t border-b border-[var(--color-border-default)]/60 text-[var(--color-text-secondary)]">
                    <div>
                        <span className="text-[var(--color-text-muted)] text-[10px] block">
                            Distance
                        </span>
                        <span className="font-bold text-[var(--color-text-primary)]">
                            {(distanceM / 1000).toFixed(2)} km
                        </span>
                    </div>
                    <div>
                        <span className="text-[var(--color-text-muted)] text-[10px] block">
                            Est. Time
                        </span>
                        <span className="font-bold text-[var(--color-text-primary)]">
                            ~{estimatedDurationMin} min
                        </span>
                    </div>
                    <div>
                        <span className="text-[var(--color-text-muted)] text-[10px] block">
                            Energy Margin
                        </span>
                        <span
                            className={`font-bold ${
                                marginPct >= 20
                                    ? "text-emerald-600"
                                    : marginPct > 0
                                      ? "text-amber-600"
                                      : "text-red-600"
                            }`}
                        >
                            {marginPct >= 0
                                ? `+${marginPct.toFixed(1)}%`
                                : `${marginPct.toFixed(1)}%`}
                        </span>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px] text-[var(--color-text-muted)]">
                        <span>Required: {requiredWh.toFixed(1)} Wh</span>
                        <span>Usable: {usableWh.toFixed(1)} Wh</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${
                                energyPct <= 80
                                    ? "bg-emerald-500"
                                    : energyPct <= 100
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, energyPct)}%` }}
                        />
                    </div>
                </div>

                {initialOverride && (
                    <div className="pt-1 text-[11px] text-[var(--color-text-muted)] font-mono">
                        Override: {initialOverride}
                    </div>
                )}
            </div>
        </div>
    );
}
