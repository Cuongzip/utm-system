"use client";

import { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/components/ui";
import {
    DashboardKpiStrip,
    DashboardTacticalMap,
    DashboardFlightLog,
    DashboardDiagnostics,
} from "@/components/dashboard";
import { useFlightsAll, useHubsAll, useDronesAll, useActiveAlerts, useAirspaceAll } from "@/hooks";
import { formatDate } from "@/utils/format";

export default function DashboardPage() {
    const { data: allFlights = [] } = useFlightsAll();
    const { data: hubs = [] } = useHubsAll();
    const { data: drones = [] } = useDronesAll();
    const { data: alerts = [] } = useActiveAlerts();
    const { data: zones = [] } = useAirspaceAll();

    const [currentDateStr, setCurrentDateStr] = useState("2026-10-30");

    useEffect(() => {
        setCurrentDateStr(formatDate(new Date(), "yyyy-MM-dd"));
    }, []);

    const activeFlights = useMemo(() => {
        return (allFlights || []).filter((f) => {
            const s = (f.status || "").toLowerCase().replace(/[\s-]+/g, "_");
            return (
                s === "active" || s === "in_flight" || s === "diverted" || s === "emergency_landing"
            );
        });
    }, [allFlights]);

    const onlineHubsCount = useMemo(() => {
        return (hubs || []).filter((h) => {
            const s = (h.status || "active").toLowerCase();
            return s === "active" || s === "online";
        }).length;
    }, [hubs]);

    return (
        <div className="p-8 space-y-6 flex flex-col w-full min-h-[calc(100vh-80px)]">
            <PageHeader title="OPERATIONS CENTER">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-slate-200 bg-white text-xs font-mono font-medium text-slate-700 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>LIVE</span>
                        <span className="text-slate-300">|</span>
                        <span>{currentDateStr}</span>
                    </span>
                </div>
            </PageHeader>

            <DashboardKpiStrip
                activeFlightsCount={activeFlights.length}
                hubsCount={onlineHubsCount}
                totalHubsCount={hubs.length}
                fleetCount={drones.length}
                conflictsCount={alerts.length}
            />

            <DashboardTacticalMap
                flights={allFlights}
                hubs={hubs}
                dronesCount={drones.length}
                airspaceZones={zones}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                <DashboardFlightLog flights={allFlights} />
                <DashboardDiagnostics
                    hubsOnline={onlineHubsCount}
                    totalHubs={hubs.length}
                    fleetSize={drones.length}
                    conflictsCount={alerts.length}
                />
            </div>
        </div>
    );
}
