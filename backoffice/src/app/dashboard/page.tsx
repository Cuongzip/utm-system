"use client";

import { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";
import {
    DashboardKpiStrip,
    DashboardTacticalMap,
    DashboardFlightLog,
    DashboardDiagnostics,
} from "@/components/dashboard";
import {
    useFlightsAll,
    useHubsAll,
    useDronesAll,
    useActiveAlerts,
    useAirspaceAll,
    useLiveTelemetry,
    QUERY_KEYS,
} from "@/hooks";
import { connectivityService } from "@/services/connectivityService";
import { formatDateTime } from "@/utils/format";

export default function DashboardPage() {
    const {
        data: allFlights = [],
        isLoading: isLoadingFlights,
        isError: isErrorFlights,
    } = useFlightsAll();
    const { data: hubs = [], isLoading: isLoadingHubs, isError: isErrorHubs } = useHubsAll();
    const {
        data: drones = [],
        isLoading: isLoadingDrones,
        isError: isErrorDrones,
    } = useDronesAll();
    const { data: alerts = [], isError: isErrorAlerts } = useActiveAlerts();
    const { data: zones = [], isError: isErrorZones } = useAirspaceAll();

    const { data: devices = [] } = useQuery({
        queryKey: QUERY_KEYS.connectivityDevices,
        queryFn: async () => {
            const res = await connectivityService.getDevices();
            return res?.items || [];
        },
    });

    const [lastSyncedTime, setLastSyncedTime] = useState("");

    useEffect(() => {
        setLastSyncedTime(formatDateTime(new Date(), "HH:mm:ss"));
    }, [allFlights, hubs, drones, alerts, zones, devices]);

    const activeFlights = useMemo(() => {
        return (allFlights || []).filter((f) => {
            const s = (f.status || "").toLowerCase().replace(/[\s-]+/g, "_");
            return (
                s === "active" || s === "in_flight" || s === "diverted" || s === "emergency_landing"
            );
        });
    }, [allFlights]);

    const { telemetryMap, telemetryHistoryMap, isSocketConnected, activeTelemetryCount } =
        useLiveTelemetry(activeFlights);

    const onlineHubsCount = useMemo(() => {
        return (hubs || []).filter((h) => {
            const s = (h.status || "active").toLowerCase();
            return s === "active" || s === "online";
        }).length;
    }, [hubs]);

    const apiStatus = useMemo(() => {
        if (isLoadingFlights || isLoadingHubs || isLoadingDrones) return "loading";
        if (isErrorFlights && isErrorHubs) return "error";
        if (isErrorFlights || isErrorHubs || isErrorDrones || isErrorAlerts || isErrorZones) {
            return "degraded";
        }
        return "connected";
    }, [
        isLoadingFlights,
        isLoadingHubs,
        isLoadingDrones,
        isErrorFlights,
        isErrorHubs,
        isErrorDrones,
        isErrorAlerts,
        isErrorZones,
    ]);

    return (
        <div className="p-8 space-y-6 flex flex-col w-full min-h-[calc(100vh-80px)]">
            <PageHeader title="OPERATIONS CENTER" />

            <DashboardKpiStrip
                activeFlightsCount={activeFlights.length}
                hubsCount={onlineHubsCount}
                totalHubsCount={hubs.length}
                fleetCount={drones.length}
                conflictsCount={alerts.length}
                activeTelemetryCount={activeTelemetryCount}
                isLoading={isLoadingFlights || isLoadingHubs}
            />

            <DashboardTacticalMap
                flights={allFlights}
                activeFlights={activeFlights}
                hubs={hubs}
                dronesCount={drones.length}
                airspaceZones={zones}
                telemetryMap={telemetryMap}
                telemetryHistoryMap={telemetryHistoryMap}
                activeTelemetryCount={activeTelemetryCount}
                isSocketConnected={isSocketConnected}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                <DashboardFlightLog flights={allFlights} isLoading={isLoadingFlights} />
                <DashboardDiagnostics
                    hubsOnline={onlineHubsCount}
                    totalHubs={hubs.length}
                    fleetSize={drones.length}
                    conflictsCount={alerts.length}
                    connectedDevicesCount={devices.length}
                    apiStatus={apiStatus}
                    isSocketConnected={isSocketConnected}
                    activeTelemetryCount={activeTelemetryCount}
                    lastSyncedTime={lastSyncedTime}
                />
            </div>
        </div>
    );
}
