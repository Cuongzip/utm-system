"use client";

import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";
import { ChamferCard, EmptyState } from "@/components/ui";
import type { EmergencyStatsVm } from "@/types";
import type { DroneSummaryInfo } from "./useEmergencyTrendsAnalytics";

interface TopAircraftIncidentsCardProps {
    sortedDrones: NonNullable<EmergencyStatsVm["byDrone"]>;
    droneMap: ReadonlyMap<string, DroneSummaryInfo>;
}

export function TopAircraftIncidentsCard({
    sortedDrones,
    droneMap,
}: TopAircraftIncidentsCardProps) {
    const t = useTranslations("emergency");

    return (
        <ChamferCard size="lg" className="w-full">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                    {t("trends.byAircraftHeading")}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                    {t("trends.topUnits", {
                        count: Math.min(sortedDrones.length, 8),
                    })}
                </span>
            </div>

            {sortedDrones.length === 0 ? (
                <EmptyState
                    compact
                    icon={Activity}
                    title={t("trends.noAircraftTitle")}
                    description={t("trends.noAircraftDesc")}
                />
            ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sortedDrones.slice(0, 8).map((entry) => {
                        const info = droneMap.get(entry.droneId);
                        const reg =
                            info?.registration ??
                            (entry.droneId.length > 12
                                ? `DRN-${entry.droneId.slice(0, 8).toUpperCase()}`
                                : entry.droneId);
                        const incidentCount = Number(entry.count ?? 0);
                        return (
                            <div
                                key={entry.droneId}
                                className="p-3.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] flex flex-col gap-1"
                            >
                                <span className="font-mono text-xs font-bold text-slate-900 truncate">
                                    {reg}
                                </span>
                                {info?.model && (
                                    <span className="text-[11px] text-slate-500 truncate">
                                        {info.model}
                                    </span>
                                )}
                                <div className="flex items-baseline gap-1.5 mt-1.5">
                                    <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                                        {incidentCount}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-500 uppercase">
                                        {t("trends.incidentsUnit", {
                                            count: incidentCount,
                                        })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </ChamferCard>
    );
}
