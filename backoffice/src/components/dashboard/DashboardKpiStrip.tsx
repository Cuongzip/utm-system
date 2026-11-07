"use client";

import { Plane, Building2, Bot, AlertTriangle } from "lucide-react";
import { MetricCard } from "@/components/ui";

export interface DashboardKpiStripProps {
    activeFlightsCount: number;
    hubsCount: number;
    totalHubsCount: number;
    fleetCount: number;
    conflictsCount: number;
    activeTelemetryCount?: number;
    isLoading?: boolean;
}

export function DashboardKpiStrip({
    activeFlightsCount,
    hubsCount,
    totalHubsCount,
    fleetCount,
    conflictsCount,
    activeTelemetryCount = 0,
    isLoading = false,
}: DashboardKpiStripProps) {
    const kpiCards = [
        {
            id: "active-flights",
            title: "ACTIVE FLIGHTS",
            value: isLoading ? "--" : String(activeFlightsCount).padStart(2, "0"),
            subValue:
                activeTelemetryCount > 0
                    ? `${activeTelemetryCount} STREAMING`
                    : activeFlightsCount > 0
                      ? "AIRBORNE"
                      : "STANDBY",
            icon: Plane,
            iconClassName: "text-cyan-600",
        },
        {
            id: "hubs-online",
            title: "HUBS ONLINE",
            value: isLoading ? "--" : String(hubsCount).padStart(2, "0"),
            subValue: `OF ${totalHubsCount} TOTAL`,
            icon: Building2,
            iconClassName: "text-emerald-600",
        },
        {
            id: "fleet",
            title: "FLEET",
            value: isLoading ? "--" : String(fleetCount).padStart(2, "0"),
            subValue: "REGISTERED",
            icon: Bot,
            iconClassName: "text-amber-600",
        },
        {
            id: "conflicts",
            title: "CONFLICTS",
            value: isLoading ? "--" : String(conflictsCount).padStart(2, "0"),
            subValue: conflictsCount > 0 ? "ACTION REQUIRED" : "ALL CLEAR",
            icon: AlertTriangle,
            iconClassName: conflictsCount > 0 ? "text-rose-600" : "text-emerald-600",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
            {kpiCards.map((card) => (
                <MetricCard
                    key={card.id}
                    title={card.title}
                    value={card.value}
                    subValue={card.subValue}
                    icon={card.icon}
                    iconClassName={card.iconClassName}
                />
            ))}
        </div>
    );
}
