"use client";

import { useTranslations } from "next-intl";
import { Plane, Building2, Drone, AlertTriangle } from "lucide-react";
import { KpiStrip, type KpiItem } from "@/components/ui";

interface DashboardKpiStripProps {
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
    const t = useTranslations("dashboard.kpi");

    const items: KpiItem[] = [
        {
            id: "active-flights",
            label: t("activeFlights"),
            value: activeFlightsCount,
            subValue:
                activeTelemetryCount > 0
                    ? t("streamingCount", { count: activeTelemetryCount })
                    : activeFlightsCount > 0
                      ? t("airborne")
                      : t("standby"),
            icon: Plane,
        },
        {
            id: "hubs-online",
            label: t("hubsOnline"),
            value: hubsCount,
            subValue: t("ofTotal", { total: totalHubsCount }),
            icon: Building2,
        },
        {
            id: "fleet",
            label: t("registeredFleet"),
            value: fleetCount,
            subValue: t("uavUnits"),
            icon: Drone,
        },
        {
            id: "conflicts",
            label: t("airspaceConflicts"),
            value: conflictsCount,
            subValue: conflictsCount > 0 ? t("actionRequired") : t("clear"),
            icon: AlertTriangle,
        },
    ];

    return <KpiStrip items={items} loading={isLoading} columns={4} />;
}
