"use client";

import { useTranslations } from "next-intl";
import {
    Drone,
    CheckCircle2,
    PlaneTakeoff,
    BatteryCharging,
    Building2,
    Activity,
} from "lucide-react";
import { KpiStrip, type KpiItem } from "@/components/ui";
import type { FleetOverview } from "@/types";

interface FleetKpiStripProps {
    overview?: FleetOverview;
    loading: boolean;
}

export function FleetKpiStrip({ overview, loading }: FleetKpiStripProps) {
    const t = useTranslations("fleet.kpi");
    const total = overview?.totalDrones ?? 0;
    const available = overview?.availableDrones ?? 0;
    const busy = overview?.busyDrones ?? 0;
    const charging = overview?.chargingDrones ?? 0;
    const maintenance = overview?.maintenanceDrones ?? 0;
    const offline = overview?.offlineDrones ?? 0;
    const hubCount = overview?.hubStatuses?.length ?? 0;
    const healthPct = Math.round(overview?.fleetHealth ?? 0);

    const safeTotal = Math.max(total, 1);
    const availablePct = Math.round((available / safeTotal) * 100);
    const busyPct = Math.round((busy / safeTotal) * 100);
    const chargingPct = Math.round((charging / safeTotal) * 100);
    const otherPct = Math.max(0, 100 - availablePct - busyPct - chargingPct);

    const items: KpiItem[] = [
        {
            id: "total",
            label: t("totalDrones"),
            value: total,
            subValue: overview?.activeMissions
                ? t("activeMissions", { count: overview.activeMissions })
                : t("fleetWide"),
            icon: Drone,
        },
        {
            id: "available",
            label: t("available"),
            value: available,
            subValue: total > 0 ? t("pctReady", { pct: availablePct }) : t("standby"),
            icon: CheckCircle2,
        },
        {
            id: "in-flight",
            label: t("inFlight"),
            value: busy,
            subValue: total > 0 ? t("pctActive", { pct: busyPct }) : t("airborne"),
            icon: PlaneTakeoff,
        },
        {
            id: "charging",
            label: t("chargingMaint"),
            value: charging,
            subValue: t("maintOffSub", { maint: maintenance, off: offline }),
            icon: BatteryCharging,
        },
        {
            id: "hubs",
            label: t("activeHubs"),
            value: hubCount,
            subValue: t("vertiports"),
            icon: Building2,
        },
        {
            id: "health",
            label: t("fleetHealth"),
            value: `${healthPct}%`,
            subValue:
                overview?.averageFlightHours != null
                    ? t("avgHours", { hours: overview.averageFlightHours.toFixed(1) })
                    : t("operational"),
            icon: Activity,
        },
    ];

    const footerBar =
        !loading && total > 0 ? (
            <div className="px-4 py-2 flex flex-col gap-1.5">
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                        className="bg-emerald-600 transition-[width] duration-300"
                        style={{ width: `${availablePct}%` }}
                        title={t("barAvailableTooltip", { pct: availablePct })}
                    />
                    <div
                        className="bg-sky-600 transition-[width] duration-300"
                        style={{ width: `${busyPct}%` }}
                        title={t("barInFlightTooltip", { pct: busyPct })}
                    />
                    <div
                        className="bg-indigo-500 transition-[width] duration-300"
                        style={{ width: `${chargingPct}%` }}
                        title={t("barChargingTooltip", { pct: chargingPct })}
                    />
                    <div
                        className="bg-amber-500 transition-[width] duration-300"
                        style={{ width: `${otherPct}%` }}
                        title={t("barMaintTooltip", { pct: otherPct })}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-emerald-600" />
                        {t("barAvailableLegend", { pct: availablePct })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-sky-600" />
                        {t("barInFlightLegend", { pct: busyPct })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-indigo-500" />
                        {t("barChargingLegend", { pct: chargingPct })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-amber-500" />
                        {t("barMaintLegend", { pct: otherPct })}
                    </span>
                </div>
            </div>
        ) : undefined;

    return <KpiStrip items={items} loading={loading} columns={6} footerBar={footerBar} />;
}
