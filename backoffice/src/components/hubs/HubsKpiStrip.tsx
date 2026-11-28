"use client";

import { useTranslations } from "next-intl";
import { Building2, CheckCircle2, Wrench, Gauge } from "lucide-react";
import { KpiStrip, type KpiItem } from "@/components/ui";
import { HUB_STATUS } from "@/types";

interface HubsKpiStripProps {
    totalHubs: number;
    activeHubs: number;
    maintenanceHubs: number;
    inactiveHubs: number;
    activeFlightsTotal: number;
    totalCapacity: number;
    stationedDronesTotal: number;
    statusFilter: string;
    onFilterByStatus: (status: string) => void;
    isLoading: boolean;
}

export function HubsKpiStrip({
    totalHubs,
    activeHubs,
    maintenanceHubs,
    inactiveHubs,
    activeFlightsTotal,
    totalCapacity,
    stationedDronesTotal,
    statusFilter,
    onFilterByStatus,
    isLoading,
}: HubsKpiStripProps) {
    const t = useTranslations("hubs.kpi");
    const offlineTotal = maintenanceHubs + inactiveHubs;
    const offlineFilterTarget = maintenanceHubs > 0 ? HUB_STATUS.MAINTENANCE : HUB_STATUS.INACTIVE;

    const items: KpiItem[] = [
        {
            id: "all",
            label: t("totalHubs"),
            value: totalHubs,
            subValue: t("vertiports"),
            icon: Building2,
            active: statusFilter === "all",
            onClick: () => onFilterByStatus("all"),
        },
        {
            id: HUB_STATUS.ACTIVE,
            label: t("activeHubs"),
            value: activeHubs,
            subValue:
                totalHubs > 0
                    ? t("pctOnline", { pct: Math.round((activeHubs / totalHubs) * 100) })
                    : t("standby"),
            icon: CheckCircle2,
            active: statusFilter === HUB_STATUS.ACTIVE,
            onClick: () =>
                onFilterByStatus(statusFilter === HUB_STATUS.ACTIVE ? "all" : HUB_STATUS.ACTIVE),
        },
        {
            id: "offline",
            label: t("maintInactive"),
            value: offlineTotal,
            subValue: t("maintOffSub", { maint: maintenanceHubs, off: inactiveHubs }),
            icon: Wrench,
            active: statusFilter === HUB_STATUS.MAINTENANCE || statusFilter === HUB_STATUS.INACTIVE,
            onClick: () =>
                onFilterByStatus(
                    statusFilter === HUB_STATUS.MAINTENANCE || statusFilter === HUB_STATUS.INACTIVE
                        ? "all"
                        : offlineFilterTarget
                ),
        },
        {
            id: "capacity",
            label: t("padLoadCap"),
            value: `${activeFlightsTotal}/${totalCapacity}`,
            subValue: t("dronesBased", { count: stationedDronesTotal }),
            icon: Gauge,
        },
    ];

    return <KpiStrip items={items} loading={isLoading} columns={4} />;
}
