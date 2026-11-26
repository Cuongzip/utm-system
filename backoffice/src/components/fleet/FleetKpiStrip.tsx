"use client";

import {
    Bot,
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
            label: "Total Drones",
            value: total,
            subValue: overview?.activeMissions
                ? `${overview.activeMissions} active msn`
                : "Fleet wide",
            icon: Bot,
        },
        {
            id: "available",
            label: "Available",
            value: available,
            subValue: total > 0 ? `${availablePct}% ready` : "Standby",
            icon: CheckCircle2,
            iconClassName: "text-emerald-600",
        },
        {
            id: "in-flight",
            label: "In Flight",
            value: busy,
            subValue: total > 0 ? `${busyPct}% active` : "Airborne",
            icon: PlaneTakeoff,
        },
        {
            id: "charging",
            label: "Charging / Maint",
            value: charging,
            subValue: `${maintenance} maint · ${offline} off`,
            icon: BatteryCharging,
            iconClassName: charging > 0 ? "text-amber-500" : undefined,
        },
        {
            id: "hubs",
            label: "Active Hubs",
            value: hubCount,
            subValue: "Vertiports",
            icon: Building2,
        },
        {
            id: "health",
            label: "Fleet Health",
            value: `${healthPct}%`,
            subValue:
                overview?.averageFlightHours != null
                    ? `${overview.averageFlightHours.toFixed(1)}h avg`
                    : "Operational",
            icon: Activity,
            iconClassName:
                healthPct >= 80
                    ? "text-emerald-600"
                    : healthPct >= 50
                      ? "text-amber-500"
                      : "text-red-600",
        },
    ];

    const footerBar =
        !loading && total > 0 ? (
            <div className="px-4 py-2 flex flex-col gap-1.5">
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                        className="bg-emerald-600 transition-all"
                        style={{ width: `${availablePct}%` }}
                        title={`Available: ${availablePct}%`}
                    />
                    <div
                        className="bg-slate-800 transition-all"
                        style={{ width: `${busyPct}%` }}
                        title={`In Flight: ${busyPct}%`}
                    />
                    <div
                        className="bg-amber-500 transition-all"
                        style={{ width: `${chargingPct}%` }}
                        title={`Charging: ${chargingPct}%`}
                    />
                    <div
                        className="bg-slate-300 transition-all"
                        style={{ width: `${otherPct}%` }}
                        title={`Maintenance / Offline: ${otherPct}%`}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-emerald-600" />
                        Available ({availablePct}%)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-slate-800" />
                        In Flight ({busyPct}%)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-amber-500" />
                        Charging ({chargingPct}%)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-slate-300" />
                        Maint / Off ({otherPct}%)
                    </span>
                </div>
            </div>
        ) : undefined;

    return <KpiStrip items={items} loading={loading} columns={6} footerBar={footerBar} />;
}
