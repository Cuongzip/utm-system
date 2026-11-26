"use client";

import { Plane, Building2, Bot, AlertTriangle } from "lucide-react";
import { KpiStrip, type KpiItem } from "@/components/ui";

export interface DashboardKpiStripProps {
    activeFlightsCount: number;
    hubsCount: number;
    totalHubsCount: number;
    fleetCount: number;
    conflictsCount: number;
    activeTelemetryCount: number;
    isLoading: boolean;
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
    const items: KpiItem[] = [
        {
            id: "active-flights",
            label: "Active Flights",
            value: activeFlightsCount,
            subValue:
                activeTelemetryCount > 0
                    ? `${activeTelemetryCount} streaming`
                    : activeFlightsCount > 0
                      ? "Airborne"
                      : "Standby",
            icon: Plane,
        },
        {
            id: "hubs-online",
            label: "Hubs Online",
            value: hubsCount,
            subValue: `of ${totalHubsCount} total`,
            icon: Building2,
        },
        {
            id: "fleet",
            label: "Registered Fleet",
            value: fleetCount,
            subValue: "UAV units",
            icon: Bot,
        },
        {
            id: "conflicts",
            label: "Airspace Conflicts",
            value: conflictsCount,
            subValue: conflictsCount > 0 ? "Action required" : "Clear",
            icon: AlertTriangle,
            iconClassName: conflictsCount > 0 ? "text-red-600" : undefined,
            statusDot: conflictsCount > 0 ? "critical" : undefined,
        },
    ];

    return <KpiStrip items={items} loading={isLoading} columns={4} />;
}
