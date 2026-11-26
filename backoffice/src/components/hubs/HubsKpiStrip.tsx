"use client";

import { Building2, CheckCircle2, Wrench, Gauge } from "lucide-react";
import { KpiStrip, type KpiItem } from "@/components/ui";

export interface HubsKpiStripProps {
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
    const offlineTotal = maintenanceHubs + inactiveHubs;
    const loadPct = totalCapacity > 0 ? Math.round((activeFlightsTotal / totalCapacity) * 100) : 0;
    const isHighLoad = loadPct >= 80;
    const offlineFilterTarget = maintenanceHubs > 0 ? "maintenance" : "inactive";

    const items: KpiItem[] = [
        {
            id: "all",
            label: "Total Hubs",
            value: totalHubs,
            subValue: "Vertiports",
            icon: Building2,
            active: statusFilter === "all",
            onClick: () => onFilterByStatus("all"),
        },
        {
            id: "active",
            label: "Active Hubs",
            value: activeHubs,
            subValue:
                totalHubs > 0 ? `${Math.round((activeHubs / totalHubs) * 100)}% online` : "Standby",
            icon: CheckCircle2,
            iconClassName: activeHubs > 0 ? "text-emerald-600" : undefined,
            active: statusFilter === "active",
            onClick: () => onFilterByStatus(statusFilter === "active" ? "all" : "active"),
        },
        {
            id: "offline",
            label: "Maint / Inactive",
            value: offlineTotal,
            subValue: `${maintenanceHubs} maint · ${inactiveHubs} off`,
            icon: Wrench,
            iconClassName: maintenanceHubs > 0 ? "text-amber-500" : undefined,
            active: statusFilter === "maintenance" || statusFilter === "inactive",
            onClick: () =>
                onFilterByStatus(
                    statusFilter === "maintenance" || statusFilter === "inactive"
                        ? "all"
                        : offlineFilterTarget
                ),
        },
        {
            id: "capacity",
            label: "Pad Load / Cap",
            value: `${activeFlightsTotal}/${totalCapacity}`,
            subValue: `${stationedDronesTotal} drones based`,
            icon: Gauge,
            iconClassName: isHighLoad ? "text-amber-600" : undefined,
        },
    ];

    return <KpiStrip items={items} loading={isLoading} columns={4} />;
}
